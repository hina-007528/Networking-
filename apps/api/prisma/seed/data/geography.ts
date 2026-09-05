import { CoverageStatus } from '@prisma/client';

export interface SeedSubArea {
  name: string;
  status?: CoverageStatus;
  expectedLiveDate?: string;
}

export interface SeedArea {
  name: string;
  status: CoverageStatus;
  expectedLiveDate?: string;
  subAreas?: SeedSubArea[];
}

export interface SeedCity {
  name: string;
  code: string;
  dialCode: string;
  province: string;
  isLive: boolean;
  latitude?: number;
  longitude?: number;
  branchAddress?: string;
  areas: SeedArea[];
}

const A = CoverageStatus.AVAILABLE;
const S = CoverageStatus.COMING_SOON;
const N = CoverageStatus.NOT_AVAILABLE;

/**
 * Development coverage map.
 *
 * Coverage is intentionally uneven: a live city still contains areas that are `COMING_SOON` or
 * `NOT_AVAILABLE`, because that is how a real fibre roll-out behaves and it is the case the
 * coverage checker has to handle correctly.
 */
export const seedCities: SeedCity[] = [
  {
    name: 'Karachi',
    code: 'KHI',
    dialCode: '021',
    province: 'Sindh',
    isLive: true,
    latitude: 24.8607,
    longitude: 67.0011,
    branchAddress: 'Plot 12, Shahrah-e-Faisal, Block 6, P.E.C.H.S., Karachi',
    areas: [
      {
        name: 'Clifton',
        status: A,
        subAreas: [
          { name: 'Block 2' },
          { name: 'Block 4' },
          { name: 'Block 5' },
          { name: 'Block 8', status: S, expectedLiveDate: '2026-11-30' },
        ],
      },
      {
        name: 'D.H.A. Phase 6',
        status: A,
        subAreas: [
          { name: 'Khayaban-e-Bukhari' },
          { name: 'Khayaban-e-Shamsheer' },
          { name: 'Khayaban-e-Muhafiz' },
        ],
      },
      { name: 'D.H.A. Phase 8', status: A, subAreas: [{ name: 'Al Murtaza' }, { name: 'Rahat Commercial' }] },
      {
        name: 'Gulshan-e-Iqbal',
        status: A,
        subAreas: [{ name: 'Block 13-D' }, { name: 'Block 10-A' }, { name: 'Block 6' }],
      },
      { name: 'Bahadurabad', status: A },
      { name: 'North Nazimabad', status: A, subAreas: [{ name: 'Block H' }, { name: 'Block N' }] },
      { name: 'Gulistan-e-Johar', status: A, subAreas: [{ name: 'Block 15' }, { name: 'Block 19' }] },
      { name: 'P.E.C.H.S.', status: A },
      { name: 'Federal B Area', status: S, expectedLiveDate: '2026-12-15' },
      { name: 'Scheme 33', status: S, expectedLiveDate: '2027-02-28' },
      { name: 'Korangi Industrial Area', status: N },
      { name: 'Malir Cantt', status: N },
    ],
  },
  {
    name: 'Lahore',
    code: 'LHE',
    dialCode: '042',
    province: 'Punjab',
    isLive: true,
    latitude: 31.5204,
    longitude: 74.3587,
    branchAddress: '45-C, Main Boulevard, Gulberg III, Lahore',
    areas: [
      {
        name: 'Gulberg III',
        status: A,
        subAreas: [{ name: 'Block C' }, { name: 'Block E' }, { name: 'Main Boulevard' }],
      },
      {
        name: 'D.H.A. Phase 5',
        status: A,
        subAreas: [{ name: 'Block B' }, { name: 'Block H' }, { name: 'Sector CCA' }],
      },
      { name: 'D.H.A. Phase 6', status: A, subAreas: [{ name: 'Block D' }, { name: 'Block L' }] },
      { name: 'Model Town', status: A },
      { name: 'Johar Town', status: A, subAreas: [{ name: 'Block G' }, { name: 'Block R1' }] },
      { name: 'Bahria Town', status: A, subAreas: [{ name: 'Sector C' }, { name: 'Overseas Block' }] },
      { name: 'Cantt', status: A },
      { name: 'Faisal Town', status: A },
      { name: 'Askari 10', status: A },
      { name: 'Allama Iqbal Town', status: S, expectedLiveDate: '2026-11-15' },
      { name: 'Valencia Town', status: S, expectedLiveDate: '2026-12-31' },
      { name: 'Shahdara', status: N },
    ],
  },
  {
    name: 'Islamabad',
    code: 'ISB',
    dialCode: '051',
    province: 'Islamabad Capital Territory',
    isLive: true,
    latitude: 33.6844,
    longitude: 73.0479,
    branchAddress: 'Plot 89, Street 14, I-9/2 Industrial Area, Islamabad',
    areas: [
      { name: 'F-7', status: A, subAreas: [{ name: 'F-7/1' }, { name: 'F-7/2' }, { name: 'F-7/3' }] },
      { name: 'F-10', status: A, subAreas: [{ name: 'F-10/1' }, { name: 'F-10/3' }] },
      { name: 'F-11', status: A, subAreas: [{ name: 'F-11/1' }, { name: 'F-11/4' }] },
      { name: 'G-11', status: A },
      { name: 'E-11', status: A, subAreas: [{ name: 'Multi Gardens' }, { name: 'FGEHF' }] },
      { name: 'I-8', status: A },
      { name: 'Bahria Enclave', status: A },
      { name: 'D.H.A. Phase 2', status: S, expectedLiveDate: '2026-10-31' },
      { name: 'Tarnol', status: N },
    ],
  },
  {
    name: 'Rawalpindi',
    code: 'RWP',
    dialCode: '051',
    province: 'Punjab',
    isLive: true,
    latitude: 33.5651,
    longitude: 73.0169,
    branchAddress: 'Office 4, Bank Road, Saddar, Rawalpindi',
    areas: [
      { name: 'Bahria Town Phase 8', status: A, subAreas: [{ name: 'Sector F' }, { name: 'Awami Villas' }] },
      { name: 'Satellite Town', status: A },
      { name: 'Chaklala Scheme 3', status: A },
      { name: 'Askari 14', status: A },
      { name: 'Gulraiz Housing', status: S, expectedLiveDate: '2026-11-30' },
      { name: 'Dhamial', status: N },
    ],
  },
  {
    name: 'Faisalabad',
    code: 'FSD',
    dialCode: '041',
    province: 'Punjab',
    isLive: true,
    latitude: 31.4187,
    longitude: 73.079,
    branchAddress: 'Kohinoor City, Jaranwala Road, Faisalabad',
    areas: [
      { name: 'Peoples Colony', status: A, subAreas: [{ name: 'Block A' }, { name: 'Block Z' }] },
      { name: 'Madina Town', status: A },
      { name: 'D Ground', status: A },
      { name: 'Susan Road', status: A },
      { name: 'Canal Road', status: S, expectedLiveDate: '2026-12-15' },
    ],
  },
  {
    name: 'Multan',
    code: 'MUX',
    dialCode: '061',
    province: 'Punjab',
    isLive: true,
    latitude: 30.1575,
    longitude: 71.5249,
    branchAddress: 'Gulgasht Colony, Bosan Road, Multan',
    areas: [
      { name: 'Gulgasht Colony', status: A },
      { name: 'Cantt', status: A },
      { name: 'Shah Rukn-e-Alam Colony', status: A },
      { name: 'Wapda Town', status: S, expectedLiveDate: '2026-11-30' },
    ],
  },
  {
    name: 'Peshawar',
    code: 'PEW',
    dialCode: '091',
    province: 'Khyber Pakhtunkhwa',
    isLive: true,
    latitude: 34.0151,
    longitude: 71.5249,
    branchAddress: 'University Road, Peshawar',
    areas: [
      { name: 'University Town', status: A },
      { name: 'Hayatabad', status: A, subAreas: [{ name: 'Phase 3' }, { name: 'Phase 6' }] },
      { name: 'Cantt', status: A },
      { name: 'Gulbahar', status: S, expectedLiveDate: '2027-01-31' },
    ],
  },
  {
    name: 'Hyderabad',
    code: 'HDD',
    dialCode: '022',
    province: 'Sindh',
    isLive: true,
    areas: [
      { name: 'Latifabad', status: A, subAreas: [{ name: 'Unit 7' }, { name: 'Unit 9' }] },
      { name: 'Qasimabad', status: A },
      { name: 'Auto Bhan Road', status: A },
    ],
  },
  {
    name: 'Gujranwala',
    code: 'GRW',
    dialCode: '055',
    province: 'Punjab',
    isLive: true,
    areas: [
      { name: 'Satellite Town', status: A },
      { name: 'Model Town', status: A },
      { name: 'D.C. Colony', status: S, expectedLiveDate: '2026-12-31' },
    ],
  },
  {
    name: 'Sialkot',
    code: 'SKT',
    dialCode: '052',
    province: 'Punjab',
    isLive: true,
    areas: [
      { name: 'Cantt', status: A },
      { name: 'Model Town', status: A },
      { name: 'Kashmir Road', status: S, expectedLiveDate: '2026-11-30' },
    ],
  },
  {
    name: 'Gujrat',
    code: 'GJT',
    dialCode: '053',
    province: 'Punjab',
    isLive: true,
    areas: [
      { name: 'Kutchery Chowk', status: A },
      { name: 'Small Industrial Estate', status: S, expectedLiveDate: '2027-01-15' },
    ],
  },
  {
    name: 'Sargodha',
    code: 'SGD',
    dialCode: '048',
    province: 'Punjab',
    isLive: true,
    areas: [
      { name: 'Satellite Town', status: A },
      { name: 'University Road', status: A },
    ],
  },
  {
    name: 'Sahiwal',
    code: 'SWL',
    dialCode: '040',
    province: 'Punjab',
    isLive: true,
    areas: [
      { name: 'Farid Town', status: A },
      { name: 'Jinnah Colony', status: S, expectedLiveDate: '2026-12-31' },
    ],
  },
  {
    name: 'Sheikhupura',
    code: 'SKP',
    dialCode: '056',
    province: 'Punjab',
    isLive: true,
    areas: [
      { name: 'Civil Lines', status: A },
      { name: 'Farooqabad', status: N },
    ],
  },
  {
    name: 'Okara',
    code: 'OKR',
    dialCode: '044',
    province: 'Punjab',
    isLive: true,
    areas: [{ name: 'Cantt', status: A }, { name: 'Model Town', status: S, expectedLiveDate: '2027-02-28' }],
  },
  {
    name: 'Jhelum',
    code: 'JHL',
    dialCode: '0544',
    province: 'Punjab',
    isLive: true,
    areas: [{ name: 'Cantt', status: A }, { name: 'Civil Lines', status: A }],
  },
  {
    name: 'Bahawalpur',
    code: 'BHW',
    dialCode: '062',
    province: 'Punjab',
    isLive: true,
    areas: [{ name: 'Model Town A', status: A }, { name: 'Satellite Town', status: S, expectedLiveDate: '2026-12-15' }],
  },
  {
    name: 'Rahim Yar Khan',
    code: 'RYK',
    dialCode: '068',
    province: 'Punjab',
    isLive: true,
    areas: [{ name: 'Model Town', status: A }, { name: 'Shahbaz Colony', status: N }],
  },
  {
    name: 'Quetta',
    code: 'UET',
    dialCode: '081',
    province: 'Balochistan',
    isLive: true,
    areas: [{ name: 'Cantt', status: A }, { name: 'Jinnah Town', status: A }, { name: 'Samungli Road', status: S, expectedLiveDate: '2027-03-31' }],
  },
  {
    name: 'Abbottabad',
    code: 'ATD',
    dialCode: '0992',
    province: 'Khyber Pakhtunkhwa',
    isLive: true,
    areas: [{ name: 'Mandian', status: A }, { name: 'Supply Bazaar', status: A }],
  },
  {
    name: 'Haripur',
    code: 'HRP',
    dialCode: '0995',
    province: 'Khyber Pakhtunkhwa',
    isLive: true,
    areas: [{ name: 'Township', status: A }, { name: 'Khalabat', status: S, expectedLiveDate: '2027-01-31' }],
  },
  {
    name: 'Mardan',
    code: 'MDN',
    dialCode: '0937',
    province: 'Khyber Pakhtunkhwa',
    isLive: true,
    areas: [{ name: 'Sheikh Maltoon Town', status: A }, { name: 'Bank Road', status: A }],
  },
  {
    name: 'Swat',
    code: 'SWT',
    dialCode: '0946',
    province: 'Khyber Pakhtunkhwa',
    isLive: true,
    areas: [{ name: 'Mingora', status: A }, { name: 'Saidu Sharif', status: A }, { name: 'Kabal', status: S, expectedLiveDate: '2027-04-30' }],
  },
  {
    name: 'Chitral',
    code: 'CJL',
    dialCode: '0943',
    province: 'Khyber Pakhtunkhwa',
    isLive: true,
    areas: [{ name: 'Chitral Town', status: A }, { name: 'Danin', status: S, expectedLiveDate: '2027-06-30' }],
  },
  {
    name: 'Wah Cantt',
    code: 'WAH',
    dialCode: '051',
    province: 'Punjab',
    isLive: true,
    areas: [{ name: 'Lalazar', status: A }, { name: 'Gudwal', status: A }],
  },
];
