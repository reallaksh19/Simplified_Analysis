# BM3 SI Unit Consistency Results

## Goal
Verify the "Calc Extended" engine can seamlessly accept SI units from the UI, pre-process them into its native Imperial computational baseline, perform the exact BM3 benchmarks (FLUOR and 2D_BUNDLE methodologies), and perfectly post-process the calculations back into user-friendly SI formats (MPa, mm, Newtons).

All benchmarks listed below are direct SI conversions of the `Calc_Benchmark_Guide_v2.md` metrics.

---

### Section 1: 2D & Standard Geometry Benchmarks

#### BM_SI 2D-1: Simple L-Bend
* **Inputs (SI):** 15.24m X-leg, 6.096m Y-leg. T_op = 148.889°C.
* **Output (`FLUOR` Mode):**
  * Stress = 1.83 MPa
  * Delta = 277.37 mm
  * Force = 1.38 N
* **Output (`2D_BUNDLE` Mode - $\mu = 0.3$):**
  * Stress = 2.10 MPa
  * Delta = 277.37 mm
  * Force = 1.79 N
* **Status:** PASS (Stress and Force properly scaled by 2D_BUNDLE friction mechanics and successfully formatted to SI).

#### BM_SI 2D-2: Symmetric U-Bend
* **Inputs (SI):** 10m legs, 5m absorber. T_op = 150°C.
* **Output (`FLUOR` Mode):**
  * Stress = 4.93 MPa
  * Delta = 526.72 mm
* **Status:** PASS (Directly mirrors original manual BM3 checks).

#### BM_SI 2D-3: Elaborate Nested Loop
* **Inputs (SI):** Loop w=6.096m, h=4.572m, runs=12.192m. T_op=148.889°C.
* **Output (`FLUOR` Mode):**
  * Stress = 1.63 MPa
  * Delta = 554.74 mm
  * Force = 0.82 N
* **Output (`2D_BUNDLE` Mode):**
  * Stress = 1.87 MPa
  * Delta = 554.74 mm
  * Force = 1.06 N
* **Status:** PASS.

---

### Section 2: 3D Solver PCF Benchmarks (Exact Numerics)

#### BM_SI 3D-1: Spatial L-Bend
* **Inputs (SI):** 9.144m X, 6.096m Y, -3.048m Z.
* **Output:**
  * X-Ax Delta = 166.42 mm
  * Y-Ax Delta = 110.95 mm
  * Z-Ax Delta = 55.47 mm
* **Status:** PASS (Maintains strict 3:2:1 geometric thermal growth ratio even through unit translation layer).

#### BM_SI 3D-2: Elevation Loop
* **Inputs (SI):** Loop up 4.572m, across 6.096m, down -4.572m.
* **Output:**
  * Stress = 1.63 MPa
  * Delta = 554.74 mm
* **Status:** PASS (Perfect symmetry mapped against 2D-3).

#### BM_SI 3D-3: Multi-Anchor Branch (Path 2)
* **Inputs (SI):** Branch from 12.192m to 12.192m X, 6.096m Y.
* **Output:**
  * Stress = 1.46 MPa
  * Delta = 221.89 mm
* **Status:** PASS.
