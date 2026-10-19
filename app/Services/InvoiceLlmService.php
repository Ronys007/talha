<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class InvoiceLlmService
{
    /**
     * Scan an uploaded invoice file and extract structured data using Google Gemini Vision API.
     *
     * @param  UploadedFile  $file
     * @return array
     */
    public function scan(UploadedFile $file): array
    {
        $apiKey = $this->resolveApiKey();
        if (! $apiKey) {
            throw new \RuntimeException('GEMINI_API_KEY is not configured in your .env file or configuration cache. Please verify GEMINI_API_KEY in your .env file and run "php artisan config:clear" on your live server.');
        }

        $mimeType = $file->getMimeType() ?: 'image/jpeg';
        $base64Data = base64_encode(file_get_contents($file->getRealPath()));

        $prompt = <<<PROMPT
You are an expert OCR and financial data extraction engine specializing in Indian GST and commercial purchase invoices.
Analyze this invoice image/document and extract all structured data into a valid JSON object following these strict rules:

1. INVOICE HEADER & METADATA:
   - po_number: The exact invoice number / bill number printed on the sheet (look for "Invoice No", "Bill No", "Inv #", "Tax Invoice #", "Ref No"). Do NOT invent or prepend "PO-" unless "PO" is literally printed on the sheet.
   - invoice_number: Same value as po_number.
   - supplier_name: The vendor, company, or seller name issuing the bill (from whom goods were purchased / seller).
   - gst_number: The 15-character GSTIN / GST Number of the supplier/seller (e.g., 27AAAAA0000A1Z5).
   - customer_name: The buyer, customer, or client name to whom goods are sold/billed (look for "Billed To", "Buyer", "Customer", "Consignee", "Client"). If none, set to null.
   - customer_gst: The 15-character GSTIN of the buyer/customer if printed, else null.
   - customer_address: The address of the buyer/customer if printed, else null.
   - order_date: The invoice date in "YYYY-MM-DD" format.

2. TAXES & GST BREAKDOWN:
   - Determine whether the invoice is Intra-State (CGST + SGST) or Inter-State (IGST):
     * If intra-state: cgst amount, sgst amount (igst = 0).
     * If inter-state: igst amount (cgst = 0, sgst = 0).
   - total_gst: Total of all GST taxes (cgst + sgst OR igst).
   - tax_rate: Overall GST tax percentage applied (e.g., 18, 12, 5, 28, or 0). If split into CGST 9% and SGST 9%, tax_rate is 18.
   - If not explicitly printed in summary, calculate total_gst and breakdown from the line items or tax table.

3. GOODS / LINE ITEMS:
   For every single item row in the goods/services table, extract:
   - sl_no: Row number (integer).
   - description: Clean, complete product/item name.
   - hsn_sac: HSN or SAC code if printed (string or null).
   - quantity: Numeric quantity (float or int).
   - unit: Unit of measurement as printed (e.g. "PCS", "KG", "CM", "MM", "M", "BOX", "SET", "LTR", "NOS", "MTR", "BAG").
   - rate: Price per unit before tax.
   - discount_percent: Line item discount percentage (e.g., 5, 10, or null).
   - discount_amount: Line item discount cash amount if printed (numeric or null).
   - taxable_amount: Pre-tax taxable value for this row (quantity * rate - discount).
   - tax_rate: Tax percentage for this item (e.g. 18, 12, 5, or null).
   - cgst: CGST amount for this item if printed (numeric or null).
   - sgst: SGST amount for this item if printed (numeric or null).
   - igst: IGST amount for this item if printed (numeric or null).
   - amount: Line item total amount (taxable amount if table shows taxable value, or total amount including taxes if table shows total).

4. FINANCIAL SUMMARY & GROSS DISCOUNT:
   - subtotal: Gross subtotal before invoice-level discount and taxes.
   - gross_discount: The overall / bill-level / gross discount amount deducted on the invoice (e.g. "Gross Discount", "Trade Discount", "Cash Discount", "Special Discount", "Scheme Discount", "Less Discount", "Bill Discount"). If printed as a percentage (e.g. 5%), calculate the actual cash amount deducted.
   - cgst: Total CGST amount.
   - sgst: Total SGST amount.
   - igst: Total IGST amount.
   - total_gst: Total GST taxes.
   - round_off: Round off amount (+/-) if printed.
   - grand_total: Final invoice payable amount (must match total_amount).

5. Return ONLY clean JSON without markdown code fences or conversational text.

Expected JSON Structure:
{
  "po_number": "string or null",
  "invoice_number": "string or null",
  "supplier_name": "string or null",
  "gst_number": "string or null",
  "customer_name": "string or null",
  "customer_gst": "string or null",
  "customer_address": "string or null",
  "order_date": "YYYY-MM-DD or null",
  "subtotal": 0.00,
  "gross_discount": 0.00,
  "tax_rate": 0.00,
  "cgst": 0.00,
  "sgst": 0.00,
  "igst": 0.00,
  "total_gst": 0.00,
  "round_off": 0.00,
  "total_amount": 0.00,
  "items": [
    {
      "sl_no": 1,
      "description": "string",
      "hsn_sac": "string or null",
      "quantity": 1,
      "unit": "PCS",
      "rate": 0.00,
      "discount_percent": null,
      "discount_amount": null,
      "taxable_amount": 0.00,
      "tax_rate": null,
      "cgst": null,
      "sgst": null,
      "igst": null,
      "amount": 0.00
    }
  ],
  "financial_summary": {
    "subtotal": 0.00,
    "gross_discount": 0.00,
    "cgst": 0.00,
    "sgst": 0.00,
    "igst": 0.00,
    "total_gst": 0.00,
    "round_off": 0.00,
    "grand_total": 0.00
  }
}
PROMPT;

        // Fastest, verified responsive models prioritized first
        $models = [
            'gemini-flash-lite-latest',
            'gemini-3.5-flash-lite',
            'gemini-3.6-flash',
            'gemini-3.7-flash',
            'gemini-flash-latest',
            'gemini-3.5-flash',
            'gemini-3.8-flash',
        ];

        $payload = [
            'contents' => [
                [
                    'parts' => [
                        ['text' => $prompt],
                        [
                            'inlineData' => [
                                'mimeType' => $mimeType,
                                'data' => $base64Data,
                            ],
                        ],
                    ],
                ],
            ],
            'generationConfig' => [
                'responseMimeType' => 'application/json',
                'temperature' => 0.1,
            ],
        ];

        $lastError = 'Unknown error';

        foreach ($models as $model) {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

            try {
                // Fast 20s timeout per model to prevent prolonged hanging
                $response = Http::timeout(20)->post($url, $payload);

                if ($response->successful()) {
                    $jsonResponse = $response->json();
                    $rawText = $jsonResponse['candidates'][0]['content']['parts'][0]['text'] ?? '{}';

                    // Strip any markdown code fences if model enclosed them
                    $cleanJson = preg_replace('/^```(?:json)?\s*/i', '', trim($rawText));
                    $cleanJson = preg_replace('/\s*```$/', '', $cleanJson);

                    $data = json_decode($cleanJson, true);
                    if (is_array($data)) {
                        return $data;
                    }
                }

                // If this model had 503 (high demand) or 429, log and failover swiftly
                $lastError = $response->json('error.message') ?: ('Gemini API status ' . $response->status());
                Log::warning("Gemini model {$model} returned {$response->status()}, falling back to next model.", ['msg' => $lastError]);
            } catch (\Throwable $ex) {
                $lastError = $ex->getMessage();
                Log::warning("Gemini model {$model} failed: " . $ex->getMessage());
            }
        }

        throw new \RuntimeException($lastError);
    }

    /**
     * Resolves the Gemini API key from config, env, or by directly reading .env.
     * Prevents failures when "php artisan config:cache" was run on live production servers
     * before the GEMINI_API_KEY was added or modified.
     */
    protected function resolveApiKey(): ?string
    {
        $candidateConfig = [
            'services.gemini.api_key',
            'services.google.api_key',
        ];

        foreach ($candidateConfig as $cfgKey) {
            $val = config($cfgKey);
            if (! empty($val)) {
                return trim($val);
            }
        }

        $envVarNames = [
            'GEMINI_API_KEY',
            'GEMINI_KEY',
            'GOOGLE_GEMINI_API_KEY',
            'GOOGLE_GEMINI_KEY',
            'GOOGLE_API_KEY',
        ];

        foreach ($envVarNames as $name) {
            $val = env($name) ?: getenv($name) ?: ($_ENV[$name] ?? null) ?: ($_SERVER[$name] ?? null);
            if (! empty($val)) {
                return trim($val);
            }
        }

        // Direct file inspection fallback (checks .env, .env.production, .env.local)
        $possibleFiles = [
            base_path('.env'),
            base_path('.env.production'),
            base_path('.env.local'),
        ];

        $pattern = '/^\s*(?:GEMINI_API_KEY|GEMINI_KEY|GOOGLE_GEMINI_API_KEY|GOOGLE_GEMINI_KEY|GOOGLE_API_KEY)\s*=\s*(.*)$/im';

        foreach ($possibleFiles as $filePath) {
            if (file_exists($filePath) && is_readable($filePath)) {
                $content = @file_get_contents($filePath);
                if ($content && preg_match($pattern, $content, $matches)) {
                    $val = trim($matches[1]);
                    if (str_contains($val, '#') && ! str_starts_with($val, '"') && ! str_starts_with($val, "'")) {
                        $val = trim(explode('#', $val)[0]);
                    }
                    $val = trim($val, "\"'");
                    if (! empty($val)) {
                        return $val;
                    }
                }
            }
        }

        return null;
    }
}
