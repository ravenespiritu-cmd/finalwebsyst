<?php

/**
 * Local PH logistics: carriers, island groups, and sample branch hubs per region.
 * Branch IDs are stable keys for API validation and dropdowns.
 */
$carriers = [
    'LBC Express',
    'J&T Express',
    'Ninja Van Philippines',
    '2GO Express',
];

$regionMeta = [
    'luzon' => [
        'label' => 'Luzon',
        'sites' => [
            ['city' => 'Manila', 'name' => 'Main Hub'],
            ['city' => 'Quezon City', 'name' => 'Sort Facility'],
            ['city' => 'Makati', 'name' => 'Business District Hub'],
            ['city' => 'Baguio', 'name' => 'North Luzon Hub'],
        ],
    ],
    'visayas' => [
        'label' => 'Visayas',
        'sites' => [
            ['city' => 'Cebu City', 'name' => 'Central Hub'],
            ['city' => 'Iloilo City', 'name' => 'Panay Hub'],
            ['city' => 'Bacolod', 'name' => 'Negros Hub'],
            ['city' => 'Tacloban', 'name' => 'Eastern Visayas Hub'],
        ],
    ],
    'mindanao' => [
        'label' => 'Mindanao',
        'sites' => [
            ['city' => 'Davao City', 'name' => 'Southern Hub'],
            ['city' => 'Cagayan de Oro', 'name' => 'Northern Mindanao Hub'],
            ['city' => 'Zamboanga City', 'name' => 'Western Mindanao Hub'],
            ['city' => 'General Santos', 'name' => 'Soccsksargen Hub'],
            ['city' => 'Butuan City', 'name' => 'Caraga Hub'],
        ],
    ],
];

$branches = [];
foreach ($regionMeta as $regionKey => $meta) {
    $branches[$regionKey] = [];
    foreach ($carriers as $carrier) {
        $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $carrier));
        $branches[$regionKey][$carrier] = [];
        foreach ($meta['sites'] as $site) {
            $citySlug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $site['city']));
            $id = $slug.'-'.$regionKey.'-'.$citySlug;
            $branches[$regionKey][$carrier][] = [
                'id' => $id,
                'name' => $carrier.' — '.$site['name'].' ('.$site['city'].')',
                'city' => $site['city'],
                'address' => $site['city'].', Philippines',
            ];
        }
    }
}

return [
    'providers' => $carriers,
    'regions' => array_combine(
        array_keys($regionMeta),
        array_column(array_values($regionMeta), 'label')
    ),
    'region_keys' => array_keys($regionMeta),
    'branches' => $branches,
];
