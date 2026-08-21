-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'BUSINESS_CUSTOMER', 'ADMINISTRATOR', 'GUEST');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('PERSONAL', 'BUSINESS', 'CARRIER', 'INTERNAL');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('IMPORT', 'EXPORT');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('EXPRESS_COURIER', 'ECONOMY_COURIER', 'ROAD_FREIGHT');

-- CreateEnum
CREATE TYPE "ContentsType" AS ENUM ('DOCUMENTS', 'PARCEL', 'MULTIPLE_PARCELS', 'BOXES', 'PALLET');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('PENDING_REVIEW', 'QUOTED', 'ACCEPTED', 'REJECTED', 'BOOKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'APPROVED', 'SENT', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('BOOKED', 'PICKUP_SCHEDULED', 'PICKUP_PENDING', 'PICKED_UP', 'COLLECTED', 'IN_TRANSIT', 'ARRIVED_AT_DESTINATION', 'CUSTOMS_CLEARANCE', 'CUSTOMS_HOLD', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FINANCIALLY_CLOSED', 'ON_HOLD', 'EXCEPTION', 'CANCELLED', 'RETURN_IN_PROGRESS', 'RETURNED', 'LOST', 'DAMAGED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('EXPRESS', 'ROAD_FREIGHT', 'AIR_FREIGHT', 'SEA_FREIGHT');

-- CreateEnum
CREATE TYPE "QuoteWorkflowStage" AS ENUM ('QUOTATION', 'BOOKING');

-- CreateEnum
CREATE TYPE "WeightUnit" AS ENUM ('KG', 'LB');

-- CreateEnum
CREATE TYPE "DimensionUnit" AS ENUM ('CM', 'IN', 'M');

-- CreateEnum
CREATE TYPE "TariffStatus" AS ENUM ('DRAFT', 'VALIDATED', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SurchargeBasis" AS ENUM ('FIXED', 'PERCENTAGE', 'PER_KG', 'PER_CHARGEABLE_KG', 'PER_PIECE', 'PER_SHIPMENT', 'PER_PALLET');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('UPLOADED', 'PARSED', 'MAPPED', 'VALIDATED', 'IMPORTED', 'FAILED');

-- CreateEnum
CREATE TYPE "CalcStatus" AS ENUM ('CALCULATED', 'MANUAL_REQUIRED', 'OVERRIDDEN', 'APPROVED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL DEFAULT 'PERSONAL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "organization_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "billing_legal_name" TEXT,
    "billing_trading_name" TEXT,
    "billing_tax_id" TEXT,
    "billing_address" TEXT,
    "billing_country" TEXT,
    "billing_phone" TEXT,
    "contact_person" TEXT,
    "phone" TEXT,
    "billing_city" TEXT,
    "billing_zip" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_profile" (
    "id" TEXT NOT NULL DEFAULT 'forwardone',
    "legal_name" TEXT,
    "tax_id" TEXT,
    "registered_address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "bank_name" TEXT,
    "bank_account" TEXT,
    "iban" TEXT,
    "swift" TEXT,
    "currency" TEXT,
    "vat_number" TEXT,
    "vat_info" TEXT,
    "default_vat_pct" DECIMAL(5,2),
    "payment_terms_days" INTEGER,
    "logo_url" TEXT,
    "footer_note" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "zip" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "kind" TEXT,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT,
    "direction" "Direction" NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "contents_type" "ContentsType" NOT NULL,
    "sender_json" JSONB NOT NULL,
    "receiver_json" JSONB NOT NULL,
    "pickup_date" TIMESTAMP(3),
    "pieces" INTEGER NOT NULL,
    "weight_kg" DECIMAL(10,2) NOT NULL,
    "dimensions_json" JSONB NOT NULL,
    "commercial_value" DECIMAL(12,2),
    "incoterms" TEXT,
    "dangerous_goods" BOOLEAN NOT NULL DEFAULT false,
    "un_number" TEXT,
    "dangerous_goods_class" TEXT,
    "special_instructions" TEXT,
    "suggested_services" JSONB,
    "status" "QuoteStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "service_category" "ServiceCategory",
    "workflow_stage" "QuoteWorkflowStage" NOT NULL DEFAULT 'QUOTATION',
    "carrier_name" TEXT,
    "service_name" TEXT,
    "customer_carrier_preference" TEXT,
    "currency" TEXT DEFAULT 'EUR',
    "is_commercial" BOOLEAN,
    "goods_description" TEXT,
    "origin_country" TEXT,
    "origin_city" TEXT,
    "origin_postal_code" TEXT,
    "dest_country" TEXT,
    "dest_city" TEXT,
    "dest_postal_code" TEXT,
    "booking_json" JSONB,
    "booking_submitted_at" TIMESTAMP(3),
    "booking_impact" TEXT,
    "booking_changes_json" JSONB,
    "draft_json" JSONB,
    "ai_conversation_json" JSONB,
    "submission_token" TEXT,
    "is_draft" BOOLEAN NOT NULL DEFAULT false,
    "needs_reapproval" BOOLEAN NOT NULL DEFAULT false,
    "request_source" TEXT,
    "internal_request_notes" TEXT,
    "created_by_admin_id" TEXT,
    "is_guest" BOOLEAN NOT NULL DEFAULT false,
    "guest_name" TEXT,
    "guest_company" TEXT,
    "guest_phone" TEXT,
    "guest_email" TEXT,
    "linked_to_customer_at" TIMESTAMP(3),
    "linked_by_admin_id" TEXT,
    "accepted_on_behalf" BOOLEAN NOT NULL DEFAULT false,
    "accepted_by_admin_id" TEXT,
    "accepted_on_behalf_at" TIMESTAMP(3),
    "acceptance_source" TEXT,
    "acceptance_reference" TEXT,
    "acceptance_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_files" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "cloud_storage_path" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reference" TEXT,
    "tracking_number" TEXT NOT NULL,
    "awb_number" TEXT,
    "carrier" TEXT NOT NULL,
    "customer_service_name" TEXT,
    "selling_price" DECIMAL(12,2),
    "selling_currency" TEXT,
    "operational_notes" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'BOOKED',
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "estimated_delivery" TIMESTAMP(3),
    "customs_sub_status" TEXT,
    "action_required" BOOLEAN NOT NULL DEFAULT false,
    "action_type" TEXT,
    "action_message" TEXT,
    "pod_path" TEXT,
    "booked_weight_kg" DECIMAL(10,2),
    "booked_piece_count" INTEGER,
    "booked_service" TEXT,
    "actual_piece_count" INTEGER,
    "actual_weight_kg" DECIMAL(10,2),
    "actual_chargeable_weight_kg" DECIMAL(10,2),
    "actual_dimensions" TEXT,
    "actual_carrier_service" TEXT,
    "actual_carrier_reference" TEXT,
    "actual_pickup_at" TIMESTAMP(3),
    "actual_delivery_at" TIMESTAMP(3),
    "actual_customs_outcome" TEXT,
    "actual_carrier_cost" DECIMAL(12,2),
    "actual_currency" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_documents" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "cloud_storage_path" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "is_customer_visible" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "customer_name" TEXT,
    "customer_email" TEXT,
    "service_name" TEXT,
    "selling_price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "charges_json" JSONB,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "vat_pct" DECIMAL(5,2),
    "vat_amount" DECIMAL(12,2),
    "total" DECIMAL(12,2) NOT NULL,
    "payment_terms" TEXT,
    "due_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "finalized_at" TIMESTAMP(3),

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_events" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "country" TEXT,
    "customer_description" TEXT,
    "internal_description" TEXT,
    "carrier_status_code" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "action_required" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_amendments" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "amendment_type" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "impact" TEXT NOT NULL DEFAULT 'NO_PRICE_IMPACT',
    "changes_json" JSONB,
    "reason" TEXT,
    "created_by" TEXT,
    "created_by_role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_amendments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_adjustments" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "adjustment_type" TEXT NOT NULL,
    "description" TEXT,
    "customer_reason" TEXT,
    "carrier_cost_adjustment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "customer_selling_adjustment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "requires_customer_approval" BOOLEAN NOT NULL DEFAULT false,
    "customer_approval_status" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),

    CONSTRAINT "shipment_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_quotations" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "revision_reason" TEXT,
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "internal_notes" TEXT,
    "included_services" TEXT,
    "excluded_services" TEXT,
    "created_by" TEXT,
    "carrier_selected" TEXT NOT NULL,
    "service_selected" TEXT,
    "override_reason" TEXT,
    "carrier_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pickup_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "delivery_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fuel_surcharge" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "insurance_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dg_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "documentation_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "customs_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "remote_area_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "other_charges" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_pct" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "markup_pct" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "markup_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vat_pct" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "final_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "notes" TEXT,
    "final_transit_time" TEXT,
    "final_tariff_version_id" TEXT,
    "decided_by" TEXT,
    "decided_at" TIMESTAMP(3),
    "decision_json" JSONB,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "response" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_pricing_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "preferred_carrier" TEXT,
    "preferred_service" TEXT,
    "preferred_currency" TEXT NOT NULL DEFAULT 'EUR',
    "discount_pct" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "credit_days" INTEGER NOT NULL DEFAULT 0,
    "credit_limit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payment_terms" TEXT,
    "special_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_pricing_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_matrices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "origin_country" TEXT NOT NULL,
    "dest_country" TEXT NOT NULL,
    "zone" TEXT,
    "service_type" "ServiceType" NOT NULL,
    "weight_from" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "weight_to" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "rate_per_kg" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "min_charge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "transit_days" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_matrices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "fuel_surcharge" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "documentation_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "markup_pct" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "vat_pct" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_counters" (
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reference_counters_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "carrier_services" (
    "id" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "code" TEXT,
    "transit_days" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carrier_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_options" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "admin_quotation_id" TEXT,
    "customer_service_id" TEXT,
    "service_name" TEXT NOT NULL,
    "transit_time" TEXT,
    "selling_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "carrier_service_id" TEXT,
    "carrier_name" TEXT,
    "carrier_service" TEXT,
    "carrier_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "margin_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pickup_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "delivery_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "remote_area_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "insurance_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dg_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "documentation_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "customs_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "other_charges" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fuel_surcharge" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "markup_pct" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "markup_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_pct" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vat_pct" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "margin_pct" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "valid_until" TIMESTAMP(3),
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_selected" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "transit_time" TEXT,
    "category" "ServiceCategory" NOT NULL DEFAULT 'EXPRESS',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "carrier_service_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_pieces" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "piece_number" INTEGER NOT NULL,
    "package_type" TEXT NOT NULL DEFAULT 'BOX',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "identical" BOOLEAN NOT NULL DEFAULT true,
    "length" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "width" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "height" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dimension_unit" "DimensionUnit" NOT NULL DEFAULT 'CM',
    "weight" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "weight_unit" "WeightUnit" NOT NULL DEFAULT 'KG',
    "stackable" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "reference" TEXT,
    "customer_ref" TEXT,
    "photo_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_pieces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volumetric_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "carrier" TEXT,
    "service" TEXT,
    "service_category" "ServiceCategory",
    "direction" "Direction",
    "origin_country" TEXT,
    "dest_country" TEXT,
    "package_type" TEXT,
    "divisor" INTEGER NOT NULL DEFAULT 5000,
    "dimension_unit" "DimensionUnit" NOT NULL DEFAULT 'CM',
    "weight_unit" "WeightUnit" NOT NULL DEFAULT 'KG',
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volumetric_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_restrictions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "carrier" TEXT,
    "service_category" "ServiceCategory",
    "country" TEXT,
    "zone" TEXT,
    "direction" "Direction",
    "max_weight_per_piece" DECIMAL(10,2),
    "max_length" DECIMAL(10,2),
    "max_width" DECIMAL(10,2),
    "max_height" DECIMAL(10,2),
    "max_length_girth" DECIMAL(10,2),
    "max_pieces" INTEGER,
    "max_shipment_weight" DECIMAL(10,2),
    "max_pallet_height" DECIMAL(10,2),
    "pallet_above_weight" DECIMAL(10,2),
    "prohibited_types" TEXT,
    "restricted_goods" TEXT,
    "non_conveyable" BOOLEAN NOT NULL DEFAULT false,
    "service_available" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_zone_mappings" (
    "id" TEXT NOT NULL,
    "carrier" TEXT,
    "service_category" "ServiceCategory",
    "country_name" TEXT NOT NULL,
    "iso_alpha2" TEXT,
    "iso_alpha3" TEXT,
    "carrier_country_name" TEXT,
    "carrier_country_code" TEXT,
    "import_zone" TEXT,
    "export_zone" TEXT,
    "service_available" BOOLEAN NOT NULL DEFAULT true,
    "postal_exceptions" TEXT,
    "remote_area" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "country_zone_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postal_code_zones" (
    "id" TEXT NOT NULL,
    "carrier" TEXT,
    "country" TEXT NOT NULL,
    "postal_from" TEXT NOT NULL,
    "postal_to" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "remote_area" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "postal_code_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_versions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "service_category" "ServiceCategory" NOT NULL,
    "service_name" TEXT,
    "direction" "Direction",
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "status" "TariffStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "customer_id" TEXT,
    "original_file_path" TEXT,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tariff_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_rows" (
    "id" TEXT NOT NULL,
    "tariff_version_id" TEXT NOT NULL,
    "direction" "Direction",
    "origin_country" TEXT,
    "dest_country" TEXT,
    "origin_zone" TEXT,
    "dest_zone" TEXT,
    "zone" TEXT,
    "weight_from" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "weight_to" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "exact_weight" DECIMAL(10,2),
    "flat_rate" DECIMAL(12,2),
    "rate_per_kg" DECIMAL(12,2),
    "additional_kg_rate" DECIMAL(12,2),
    "min_charge" DECIMAL(12,2),
    "max_charge" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tariff_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surcharge_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "carrier" TEXT,
    "service_category" "ServiceCategory",
    "direction" "Direction",
    "country" TEXT,
    "zone" TEXT,
    "postal_from" TEXT,
    "postal_to" TEXT,
    "basis" "SurchargeBasis" NOT NULL DEFAULT 'FIXED',
    "amount" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "min_amount" DECIMAL(12,2),
    "max_amount" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surcharge_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_import_jobs" (
    "id" TEXT NOT NULL,
    "carrier" TEXT,
    "service_category" "ServiceCategory",
    "file_name" TEXT NOT NULL,
    "cloud_storage_path" TEXT NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'UPLOADED',
    "sheet_name" TEXT,
    "sheets_json" JSONB,
    "mapping_json" JSONB,
    "preview_json" JSONB,
    "rows_accepted" INTEGER NOT NULL DEFAULT 0,
    "rows_rejected" INTEGER NOT NULL DEFAULT 0,
    "rows_review" INTEGER NOT NULL DEFAULT 0,
    "tariff_version_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tariff_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_import_errors" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'ERROR',
    "reason" TEXT NOT NULL,
    "raw_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tariff_import_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_calculations" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "tariff_version_id" TEXT,
    "carrier" TEXT,
    "service_name" TEXT,
    "direction" "Direction",
    "zone" TEXT,
    "total_pieces" INTEGER NOT NULL DEFAULT 0,
    "total_actual_weight" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_volumetric_weight" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_chargeable_weight" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_volume" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "volumetric_divisor" INTEGER,
    "base_rate" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "additional_kg_charge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "min_charge_adjustment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "surcharge_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "carrier_cost_subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "markup_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vat_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "suggested_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "CalcStatus" NOT NULL DEFAULT 'CALCULATED',
    "manual_reason" TEXT,
    "breakdown_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_calculation_lines" (
    "id" TEXT NOT NULL,
    "calculation_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "basis" TEXT,
    "quantity" DECIMAL(12,2),
    "rate" DECIMAL(12,4),
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "customer_visible" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quote_calculation_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_overrides" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "original_value" TEXT,
    "new_value" TEXT,
    "reason" TEXT,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_checklists" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "sender_complete" BOOLEAN NOT NULL DEFAULT false,
    "receiver_complete" BOOLEAN NOT NULL DEFAULT false,
    "pickup_address_complete" BOOLEAN NOT NULL DEFAULT false,
    "delivery_address_complete" BOOLEAN NOT NULL DEFAULT false,
    "contacts_complete" BOOLEAN NOT NULL DEFAULT false,
    "documents_complete" BOOLEAN NOT NULL DEFAULT false,
    "packages_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "data_unchanged_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "customs_info_complete" BOOLEAN NOT NULL DEFAULT false,
    "dg_requirements_complete" BOOLEAN NOT NULL DEFAULT false,
    "customer_submitted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_validation_warnings" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "piece_number" INTEGER,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "limit_type" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_validation_warnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" TEXT,
    "details_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iso2" TEXT NOT NULL,
    "iso3" TEXT,
    "calling_code" TEXT,
    "currency" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL,
    "country_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "country_id" TEXT NOT NULL,
    "region_id" TEXT,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postal_codes" (
    "id" TEXT NOT NULL,
    "country_id" TEXT NOT NULL,
    "city_id" TEXT,
    "code" TEXT NOT NULL,
    "place_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "postal_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "package_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_is_active_idx" ON "users"("role", "is_active");

-- CreateIndex
CREATE INDEX "addresses_user_id_is_favorite_idx" ON "addresses"("user_id", "is_favorite");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_reference_key" ON "quotes"("reference");

-- CreateIndex
CREATE INDEX "quotes_user_id_created_at_idx" ON "quotes"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "quotes_status_created_at_idx" ON "quotes"("status", "created_at");

-- CreateIndex
CREATE INDEX "quotes_organization_id_idx" ON "quotes"("organization_id");

-- CreateIndex
CREATE INDEX "quotes_submission_token_idx" ON "quotes"("submission_token");

-- CreateIndex
CREATE INDEX "quote_files_quote_id_idx" ON "quote_files"("quote_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_quote_id_key" ON "shipments"("quote_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_reference_key" ON "shipments"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_tracking_number_key" ON "shipments"("tracking_number");

-- CreateIndex
CREATE INDEX "shipments_user_id_status_idx" ON "shipments"("user_id", "status");

-- CreateIndex
CREATE INDEX "shipments_status_updated_at_idx" ON "shipments"("status", "updated_at");

-- CreateIndex
CREATE INDEX "shipment_documents_shipment_id_idx" ON "shipment_documents"("shipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_reference_key" ON "invoices"("reference");

-- CreateIndex
CREATE INDEX "invoices_shipment_id_idx" ON "invoices"("shipment_id");

-- CreateIndex
CREATE INDEX "invoices_user_id_status_idx" ON "invoices"("user_id", "status");

-- CreateIndex
CREATE INDEX "tracking_events_shipment_id_timestamp_idx" ON "tracking_events"("shipment_id", "timestamp");

-- CreateIndex
CREATE INDEX "shipment_amendments_shipment_id_created_at_idx" ON "shipment_amendments"("shipment_id", "created_at");

-- CreateIndex
CREATE INDEX "shipment_adjustments_shipment_id_created_at_idx" ON "shipment_adjustments"("shipment_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_quotations_status_updated_at_idx" ON "admin_quotations"("status", "updated_at");

-- CreateIndex
CREATE INDEX "admin_quotations_quote_id_is_current_idx" ON "admin_quotations"("quote_id", "is_current");

-- CreateIndex
CREATE UNIQUE INDEX "admin_quotations_quote_id_version_number_key" ON "admin_quotations"("quote_id", "version_number");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "support_tickets_user_id_created_at_idx" ON "support_tickets"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "support_tickets_status_created_at_idx" ON "support_tickets"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "business_pricing_profiles_user_id_key" ON "business_pricing_profiles"("user_id");

-- CreateIndex
CREATE INDEX "price_matrices_origin_country_dest_country_service_type_is__idx" ON "price_matrices"("origin_country", "dest_country", "service_type", "is_active");

-- CreateIndex
CREATE INDEX "quotation_templates_is_active_idx" ON "quotation_templates"("is_active");

-- CreateIndex
CREATE INDEX "carrier_services_category_is_active_idx" ON "carrier_services"("category", "is_active");

-- CreateIndex
CREATE INDEX "quote_options_quote_id_idx" ON "quote_options"("quote_id");

-- CreateIndex
CREATE INDEX "quote_options_admin_quotation_id_idx" ON "quote_options"("admin_quotation_id");

-- CreateIndex
CREATE INDEX "customer_services_category_is_active_display_order_idx" ON "customer_services"("category", "is_active", "display_order");

-- CreateIndex
CREATE INDEX "shipment_pieces_quote_id_piece_number_idx" ON "shipment_pieces"("quote_id", "piece_number");

-- CreateIndex
CREATE INDEX "volumetric_rules_carrier_service_category_is_active_idx" ON "volumetric_rules"("carrier", "service_category", "is_active");

-- CreateIndex
CREATE INDEX "service_restrictions_carrier_service_category_is_active_idx" ON "service_restrictions"("carrier", "service_category", "is_active");

-- CreateIndex
CREATE INDEX "country_zone_mappings_carrier_country_name_idx" ON "country_zone_mappings"("carrier", "country_name");

-- CreateIndex
CREATE INDEX "postal_code_zones_carrier_country_idx" ON "postal_code_zones"("carrier", "country");

-- CreateIndex
CREATE INDEX "tariff_versions_carrier_service_category_status_idx" ON "tariff_versions"("carrier", "service_category", "status");

-- CreateIndex
CREATE INDEX "tariff_rows_tariff_version_id_origin_country_dest_country_idx" ON "tariff_rows"("tariff_version_id", "origin_country", "dest_country");

-- CreateIndex
CREATE INDEX "tariff_rows_tariff_version_id_zone_weight_to_idx" ON "tariff_rows"("tariff_version_id", "zone", "weight_to");

-- CreateIndex
CREATE INDEX "surcharge_rules_carrier_service_category_is_active_idx" ON "surcharge_rules"("carrier", "service_category", "is_active");

-- CreateIndex
CREATE INDEX "tariff_import_jobs_status_created_at_idx" ON "tariff_import_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "tariff_import_errors_job_id_idx" ON "tariff_import_errors"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "quote_calculations_quote_id_key" ON "quote_calculations"("quote_id");

-- CreateIndex
CREATE INDEX "quote_calculation_lines_calculation_id_idx" ON "quote_calculation_lines"("calculation_id");

-- CreateIndex
CREATE INDEX "pricing_overrides_quote_id_created_at_idx" ON "pricing_overrides"("quote_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "booking_checklists_quote_id_key" ON "booking_checklists"("quote_id");

-- CreateIndex
CREATE INDEX "package_validation_warnings_quote_id_idx" ON "package_validation_warnings"("quote_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "countries_name_key" ON "countries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "countries_iso2_key" ON "countries"("iso2");

-- CreateIndex
CREATE UNIQUE INDEX "countries_iso3_key" ON "countries"("iso3");

-- CreateIndex
CREATE INDEX "countries_is_active_idx" ON "countries"("is_active");

-- CreateIndex
CREATE INDEX "regions_country_id_idx" ON "regions"("country_id");

-- CreateIndex
CREATE INDEX "regions_is_active_idx" ON "regions"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "regions_country_id_name_key" ON "regions"("country_id", "name");

-- CreateIndex
CREATE INDEX "cities_country_id_idx" ON "cities"("country_id");

-- CreateIndex
CREATE INDEX "cities_region_id_idx" ON "cities"("region_id");

-- CreateIndex
CREATE INDEX "cities_country_id_name_idx" ON "cities"("country_id", "name");

-- CreateIndex
CREATE INDEX "cities_is_active_idx" ON "cities"("is_active");

-- CreateIndex
CREATE INDEX "postal_codes_country_id_idx" ON "postal_codes"("country_id");

-- CreateIndex
CREATE INDEX "postal_codes_city_id_idx" ON "postal_codes"("city_id");

-- CreateIndex
CREATE INDEX "postal_codes_country_id_code_idx" ON "postal_codes"("country_id", "code");

-- CreateIndex
CREATE INDEX "postal_codes_is_active_idx" ON "postal_codes"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "package_types_code_key" ON "package_types"("code");

-- CreateIndex
CREATE INDEX "package_types_is_active_idx" ON "package_types"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE INDEX "currencies_is_active_idx" ON "currencies"("is_active");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_files" ADD CONSTRAINT "quote_files_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_documents" ADD CONSTRAINT "shipment_documents_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_amendments" ADD CONSTRAINT "shipment_amendments_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_adjustments" ADD CONSTRAINT "shipment_adjustments_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_quotations" ADD CONSTRAINT "admin_quotations_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_quotations" ADD CONSTRAINT "admin_quotations_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_pricing_profiles" ADD CONSTRAINT "business_pricing_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_options" ADD CONSTRAINT "quote_options_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_options" ADD CONSTRAINT "quote_options_admin_quotation_id_fkey" FOREIGN KEY ("admin_quotation_id") REFERENCES "admin_quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_pieces" ADD CONSTRAINT "shipment_pieces_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariff_rows" ADD CONSTRAINT "tariff_rows_tariff_version_id_fkey" FOREIGN KEY ("tariff_version_id") REFERENCES "tariff_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariff_import_errors" ADD CONSTRAINT "tariff_import_errors_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "tariff_import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_calculations" ADD CONSTRAINT "quote_calculations_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_calculation_lines" ADD CONSTRAINT "quote_calculation_lines_calculation_id_fkey" FOREIGN KEY ("calculation_id") REFERENCES "quote_calculations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_overrides" ADD CONSTRAINT "pricing_overrides_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_overrides" ADD CONSTRAINT "pricing_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_checklists" ADD CONSTRAINT "booking_checklists_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_validation_warnings" ADD CONSTRAINT "package_validation_warnings_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regions" ADD CONSTRAINT "regions_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postal_codes" ADD CONSTRAINT "postal_codes_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postal_codes" ADD CONSTRAINT "postal_codes_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

