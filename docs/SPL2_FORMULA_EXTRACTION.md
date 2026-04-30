# SPL2 Formula Extraction

This document outlines the engineering calculations found in the legacy SPL2 bundle.

## 1. Simplified Stress Check (`calculateSimplified` in `spl2_simp_logic.js`)
* **Inputs**: NPS, Schedule, Material, Temperature (F), Allowable Stress (psi), Lengths (lx, ly, lz in ft).
* **Outputs**: D (in), t (in), Ec (Msi), Expansion (in/100ft), dx/dy/dz (in), Stress (psi), Moment (lb-ft), Status (Pass/Fail).
* **Units**: inches, ft, psi, Msi, Fahrenheit.
* **Assumptions / Hard-coded constants**:
  - `alpha_in_ft = exp_100 / 100` (Expansion rate per foot).
  - Total displacement `d_total_expansion = Math.sqrt(dx^2 + dy^2 + dz^2)`.
  - Polynomial Curve Fit for MW Kellogg method is roughly proxied by `factor_y = (0.016 * D * d_total_expansion) / Math.pow(L_total, 2)`.
  - Approx stress `stress_calc = ec_psi * factor_y`.
  - Approx moment `moment_calc = (stress_calc * ((Math.PI / 32) * Math.pow(D, 3))) / 12`.
  - If `stress_calc < sa`, it passes.

## 2. Expansion Loop (`calculateLoop` in `spl2_loop_logic.js`)
* **Inputs**: NPS, Schedule, Material, Temperature (F), Allowable Stress, S, G, H, W (loop dimensions).
* **Outputs**: Ec, Expansion, D (in), t (in), I (in^4), Z (in^3), Bend Radius R (in), Flexibility factor h, k, SIF beta, Total Length L.
* **Units**: inches, Msi, Fahrenheit.
* **Assumptions / Hard-coded constants**:
  - `r_in = d_in * 1.5` (1.5D bend factor).
  - `I = (Math.PI / 64) * (D^4 - d^4)`.
  - `Z = (Math.PI / 32) * (D^4 - d^4) / D`.
  - `factor_h = (t_in * r_in) / Math.pow((d_in / 2), 2)` (Standard flexibility characteristic h).
  - Flexibility factor `k = 1.65 / factor_h`.
  - In-plane SIF `beta = 0.9 / Math.pow(factor_h, 0.66)`.
  - Loop Length `L = W + (2 * H) + S + G`.

## 3. Pipe Rack Load (`calculateRackLoad` in `spl2_rack_logic.js`)
* **Inputs**: NPS, Schedule, Specific Gravity (sg), Insulation Thickness (in), Insulation Density (lb/ft3), Spacing (ft), Bents, Wind Load (lbf/ft).
* **Outputs**: W_pipe, W_cont, W_test, W_insul (all lb/ft), De, Do, Dt (lb), Wind total (lbf).
* **Units**: inches, lb/ft, lb.
* **Assumptions / Hard-coded constants**:
  - Water density `62.4 lb/ft3`.
  - Test fluid SG = 1.0 (water).
  - Insulation Density default `12 lb/ft3`.
  - Empty Load `De = (w_pipe + w_insul) * spacing`.
  - Operating Load `Do = (w_pipe + w_insul + w_cont) * spacing`.
  - Test Load `Dt = (w_pipe + w_insul + w_test) * spacing`.
  - Wind Load total `w_total = windLoadFt * projectedDiaFt * spacing` where `projectedDiaFt = (d_in + 2 * insulThick) / 12`.
