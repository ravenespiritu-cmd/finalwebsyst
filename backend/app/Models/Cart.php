<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cart extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'user_id',
        'session_id',
        'subtotal',
        'tax',
        'shipping',
        'discount',
        'total',
        'coupon_code',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'shipping' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    /**
     * Get the cart owner.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get cart items.
     */
    public function items(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    /**
     * Calculate cart totals.
     */
    public function calculateTotals(): void
    {
        $subtotal = $this->items->sum('total_price');
        $tax = $subtotal * 0.12; // 12% VAT
        $freeShippingThresholdSetting = SystemSetting::get('free_shipping_threshold', 1500);
        $defaultShippingFeeSetting = SystemSetting::get('default_shipping_fee', 150);
        $freeShippingThreshold = is_numeric($freeShippingThresholdSetting) ? (float) $freeShippingThresholdSetting : 1500;
        $defaultShippingFee = is_numeric($defaultShippingFeeSetting) ? (float) $defaultShippingFeeSetting : 150;
        $shipping = $subtotal >= $freeShippingThreshold ? 0 : $defaultShippingFee;
        $total = $subtotal + $tax + $shipping - $this->discount;

        $this->update([
            'subtotal' => $subtotal,
            'tax' => $tax,
            'shipping' => $shipping,
            'total' => max(0, $total),
        ]);
    }

    /**
     * Get total items count.
     */
    public function getItemsCountAttribute(): int
    {
        return $this->items->sum('quantity');
    }

    /**
     * Clear the cart.
     */
    public function clear(): void
    {
        $this->items()->delete();
        $this->update([
            'subtotal' => 0,
            'tax' => 0,
            'shipping' => 0,
            'discount' => 0,
            'total' => 0,
            'coupon_code' => null,
        ]);
    }
}
