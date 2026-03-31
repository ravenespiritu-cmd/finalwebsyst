<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'order_id',
        'payment_method',
        'transaction_id',
        'amount',
        'currency',
        'status',
        'payment_details',
        'notes',
        'paid_at',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'amount' => 'decimal:2',
        'payment_details' => 'array',
        'paid_at' => 'datetime',
    ];

    /**
     * Payment methods.
     */
    const METHOD_CREDIT_CARD = 'credit_card';
    const METHOD_GCASH = 'gcash';
    const METHOD_MAYA = 'maya';
    const METHOD_COD = 'cod';
    const METHOD_BANK_TRANSFER = 'bank_transfer';

    /**
     * Payment statuses.
     */
    const STATUS_PENDING = 'pending';
    const STATUS_PROCESSING = 'processing';
    const STATUS_COMPLETED = 'completed';
    const STATUS_FAILED = 'failed';
    const STATUS_REFUNDED = 'refunded';
    const STATUS_CANCELLED = 'cancelled';

    /**
     * Get the order.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Check if payment is successful.
     */
    public function isSuccessful(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    /**
     * Mark payment as completed.
     */
    public function markAsCompleted(?string $transactionId = null): void
    {
        $this->update([
            'status' => self::STATUS_COMPLETED,
            'transaction_id' => $transactionId ?? $this->transaction_id,
            'paid_at' => now(),
        ]);
    }

    /**
     * Mark payment as failed.
     */
    public function markAsFailed(?string $reason = null): void
    {
        $this->update([
            'status' => self::STATUS_FAILED,
            'notes' => $reason,
        ]);
    }

    /**
     * Get available payment methods.
     */
    public static function getPaymentMethods(): array
    {
        return [
            self::METHOD_GCASH => 'GCash',
            self::METHOD_COD => 'Cash on Delivery',
        ];
    }
}
