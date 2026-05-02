/**
 * ASME B36.10M Pipe Schedules
 * Maps nominal pipe size (DN/mm) to exact Outside Diameter (OD) and Wall Thickness (WT) by schedule.
 * All units are in millimeters (mm).
 */

export const ASME_B36_10 = {
    // 1"
    "25": {
        od: 33.4,
        schedules: {
            "10": 2.77,
            "STD": 3.38,
            "40": 3.38,
            "XS": 4.55,
            "80": 4.55,
            "160": 6.35,
            "XXS": 9.09
        }
    },
    // 1.5"
    "40": {
        od: 48.3,
        schedules: {
            "10": 2.77,
            "STD": 3.68,
            "40": 3.68,
            "XS": 5.08,
            "80": 5.08,
            "160": 7.14,
            "XXS": 10.15
        }
    },
    // 2"
    "50": {
        od: 60.3,
        schedules: {
            "10": 2.77,
            "STD": 3.91,
            "40": 3.91,
            "XS": 5.54,
            "80": 5.54,
            "160": 8.74,
            "XXS": 11.07
        }
    },
    // 3"
    "80": {
        od: 88.9,
        schedules: {
            "10": 3.05,
            "STD": 5.49,
            "40": 5.49,
            "XS": 7.62,
            "80": 7.62,
            "160": 11.13,
            "XXS": 15.24
        }
    },
    // 4"
    "100": {
        od: 114.3,
        schedules: {
            "10": 3.05,
            "STD": 6.02,
            "40": 6.02,
            "XS": 8.56,
            "80": 8.56,
            "160": 13.49,
            "XXS": 17.12
        }
    },
    // 6"
    "150": {
        od: 168.3,
        schedules: {
            "10": 3.40,
            "STD": 7.11,
            "40": 7.11,
            "XS": 10.97,
            "80": 10.97,
            "160": 18.26,
            "XXS": 21.95
        }
    },
    // 8"
    "200": {
        od: 219.1,
        schedules: {
            "10": 3.76,
            "STD": 8.18,
            "40": 8.18,
            "XS": 12.70,
            "80": 12.70,
            "160": 23.01,
            "XXS": 22.23
        }
    },
    // 10"
    "250": {
        od: 273.0,
        schedules: {
            "10": 4.19,
            "STD": 9.27,
            "40": 9.27,
            "XS": 12.70,
            "80": 15.09,
            "160": 28.58,
            "XXS": 25.40
        }
    },
    // 12"
    "300": {
        od: 323.8,
        schedules: {
            "10": 4.57,
            "STD": 9.53,
            "40": 10.31,
            "XS": 12.70,
            "80": 17.48,
            "160": 33.32,
            "XXS": 25.40
        }
    },
    // 16"
    "400": {
        od: 406.4,
        schedules: {
            "10": 6.35,
            "STD": 9.53,
            "40": 12.70,
            "XS": 12.70,
            "80": 21.44,
            "160": 40.49
        }
    },
    // 24"
    "600": {
        od: 609.6,
        schedules: {
            "10": 6.35,
            "STD": 9.53,
            "40": 17.48,
            "XS": 12.70,
            "80": 30.96,
            "160": 59.54
        }
    }
};

/**
 * Given a nominal bore (mm), return its exact OD and a list of available schedules.
 * If the bore is not exactly in the DB, it extrapolates a schedule 40 equivalent.
 */
export function getPipeDimensions(boreMm, schedule = 'STD') {
    const boreStr = String(boreMm);
    const dbEntry = ASME_B36_10[boreStr];
    
    if (dbEntry) {
        const od = dbEntry.od;
        const wt = dbEntry.schedules[schedule] || dbEntry.schedules['STD'] || dbEntry.schedules['40'];
        return { od, wt, exact: true };
    }
    
    // Fallback for non-standard bores (assume Schedule 40 proportions roughly)
    const od = boreMm; 
    const wt = boreMm * 0.065;
    return { od, wt, exact: false };
}

export function getAvailableSchedules(boreMm) {
    const boreStr = String(boreMm);
    const dbEntry = ASME_B36_10[boreStr];
    if (dbEntry) {
        return Object.keys(dbEntry.schedules);
    }
    return ['STD', 'XS', '40', '80'];
}
