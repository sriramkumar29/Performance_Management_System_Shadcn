import dayjs, { type Dayjs } from "dayjs";

interface AppraisalType {
  id: number;
  name: string;
  has_range?: boolean;
}

interface AppraisalRange {
  id: number;
  name: string;
}

// Helper function to create date range for a year
const createYearRange = (year: number): [Dayjs, Dayjs] => [
  dayjs(new Date(year, 0, 1)),
  dayjs(new Date(year, 11, 31))
];

// Helper function to handle half-year periods
const computeHalfYearPeriod = (rangeName: string, year: number): [Dayjs, Dayjs] | undefined => {
  const r = rangeName.toLowerCase();
  if (r.includes("1st") || r.includes("first")) {
    return [
      dayjs(new Date(year, 0, 1)),
      dayjs(new Date(year, 5, 30)),
    ];
  }
  if (r.includes("2nd") || r.includes("second")) {
    return [
      dayjs(new Date(year, 6, 1)),
      dayjs(new Date(year, 11, 31)),
    ];
  }
  return undefined;
};

// Helper function to handle quarter periods
const computeQuarterPeriod = (rangeName: string, year: number): [Dayjs, Dayjs] | undefined => {
  const r = rangeName.toLowerCase();
  if (r.includes("1st") || r.includes("first")) {
    return [
      dayjs(new Date(year, 0, 1)),
      dayjs(new Date(year, 2, 31)),
    ];
  }
  if (r.includes("2nd") || r.includes("second")) {
    return [
      dayjs(new Date(year, 3, 1)),
      dayjs(new Date(year, 5, 30)),
    ];
  }
  if (r.includes("3rd") || r.includes("third")) {
    return [
      dayjs(new Date(year, 6, 1)),
      dayjs(new Date(year, 8, 30)),
    ];
  }
  if (r.includes("4th") || r.includes("fourth")) {
    return [
      dayjs(new Date(year, 9, 1)),
      dayjs(new Date(year, 11, 31)),
    ];
  }
  return undefined;
};

// Helper function to handle tri-annual periods
const computeTriAnnualPeriod = (rangeName: string, year: number): [Dayjs, Dayjs] | undefined => {
  const r = rangeName.toLowerCase();
  if (r.includes("1st") || r.includes("first")) {
    return [
      dayjs(new Date(year, 0, 1)),
      dayjs(new Date(year, 3, 30)),
    ];
  }
  if (r.includes("2nd") || r.includes("second")) {
    return [
      dayjs(new Date(year, 4, 1)),
      dayjs(new Date(year, 7, 31)),
    ];
  }
  if (r.includes("3rd") || r.includes("third")) {
    return [
      dayjs(new Date(year, 8, 1)),
      dayjs(new Date(year, 11, 31)),
    ];
  }
  return undefined;
};

// Main function to compute appraisal period based on type and range
export const computePeriod = (
  typeMeta: AppraisalType | undefined,
  rangeMeta?: AppraisalRange
): [Dayjs, Dayjs] | undefined => {
  if (!typeMeta) return undefined;
  
  const year = new Date().getFullYear();
  const t = typeMeta.name.toLowerCase();

  // If type doesn't have range, return full year
  if (!typeMeta.has_range) {
    return createYearRange(year);
  }

  // If type has range but no range selected, return undefined
  if (!rangeMeta) return undefined;

  // Handle different period types based on type name
  if (t.includes("half") || t.includes("semi")) {
    return computeHalfYearPeriod(rangeMeta.name, year);
  }

  if (t.includes("quarter")) {
    return computeQuarterPeriod(rangeMeta.name, year);
  }

  if (t.includes("tri")) {
    return computeTriAnnualPeriod(rangeMeta.name, year);
  }

  // Default fallback to full year
  return createYearRange(year);
};