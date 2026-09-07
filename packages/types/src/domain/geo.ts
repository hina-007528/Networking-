import type { CoverageStatus, LeadStatus } from '../enums';

export interface CityDto {
  id: string;
  name: string;
  slug: string;
  code: string;
  /** Landline area code used to build the city helpline, e.g. `042`. */
  dialCode: string;
  province: string;
  isActive: boolean;
  isLive: boolean;
  latitude: number | null;
  longitude: number | null;
  areaCount: number;
  supportPhone: string;
  branchAddress: string | null;
  mapUrl: string | null;
  displayOrder: number;
}

export interface AreaDto {
  id: string;
  cityId: string;
  name: string;
  slug: string;
  coverageStatus: CoverageStatus;
  expectedLiveDate: string | null;
  isActive: boolean;
  subAreaCount: number;
}

export interface SubAreaDto {
  id: string;
  areaId: string;
  name: string;
  slug: string;
  coverageStatus: CoverageStatus;
  expectedLiveDate: string | null;
  isActive: boolean;
}

export interface CoverageCheckRequest {
  cityId: string;
  areaId?: string;
  subAreaId?: string;
  address?: string;
  mobile?: string;
}

export interface CoverageCheckResult {
  checkId: string | null;
  status: CoverageStatus;
  serviceable: boolean;
  outsideServiceCity: boolean;
  /** Human-readable resolved location, e.g. "D.H.A. Phase 5, Lahore". */
  locationLabel: string;
  city: Pick<CityDto, 'id' | 'name' | 'slug'> | null;
  area: Pick<AreaDto, 'id' | 'name' | 'slug'> | null;
  subArea: Pick<SubAreaDto, 'id' | 'name' | 'slug'> | null;
  expectedLiveDate: string | null;
  message: string;
  /** Populated when status is AVAILABLE so the UI can show plans immediately. */
  availablePlanCount: number;
}

export interface CityWaitlistDto {
  id: string;
  name: string;
  phone: string;
  city: string;
  createdAt: string;
}

export interface CoverageLeadRequest {
  checkId?: string;
  name: string;
  mobile: string;
  email?: string;
  cityId: string;
  areaId?: string;
  subAreaId?: string;
  address?: string;
  notes?: string;
}

export interface CoverageLeadDto {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  cityId: string;
  cityName: string;
  areaId: string | null;
  areaName: string | null;
  subAreaId: string | null;
  address: string | null;
  notes: string | null;
  status: LeadStatus;
  coverageResult: CoverageStatus;
  assignedToId: string | null;
  assignedToName: string | null;
  createdAt: string;
  updatedAt: string;
}

/** City-level coverage rollup rendered on the public coverage map page. */
export interface CityCoverageSummaryDto {
  cityId: string;
  cityName: string;
  citySlug: string;
  province: string;
  isLive: boolean;
  availableAreas: number;
  comingSoonAreas: number;
  totalAreas: number;
}

export interface CoverageSummaryDto {
  cities: CityCoverageSummaryDto[];
  totalCities: number;
  liveCities: number;
  totalAreasCovered: number;
}

/** Authoritative coverage zone as managed by operators. */
export interface CoverageZoneDto {
  id: string;
  name: string;
  cityId: string;
  cityName: string;
  areaId: string | null;
  areaName: string | null;
  subAreaId: string | null;
  subAreaName: string | null;
  status: CoverageStatus;
  expectedLiveDate: string | null;
  capacityNote: string | null;
  isActive: boolean;
  updatedAt: string;
}
