# Simplified Calculation App - Benchmark Suite v2.0 (Exact Numerics)

This document defines the exact numeric inputs and calculated outputs to test the accuracy of the `Simplified-Calc-App` against B31.3 Simplified Methods (Guided Cantilever & 2D Bundle).

## Constants Used for Benchmarks
* **Material:** Carbon Steel (CS) -> $E = 29.5 \times 10^6$ psi (at ambient), $\alpha = 6.5 \times 10^{-6} \text{ in/in/}^\circ F$.
* **Pipe:** 8" NPS, SCH 40. ($OD = 8.625"$, $t = 0.322"$, $I = 72.5 \text{ in}^4$)
* **Method 1 (Fluor/Legacy):** Zero axial friction.
* **Method 2 (2D BUNDLE):** Friction factor $\mu = 0.3$ applied to anchor loads.

---

## Section 1: 2D & Standard Geometry Benchmarks

### 2D-1: Simple L-Bend (Imperial Units)
* **Geometry Setup:**
  * Anchor A (0, 0)
  * Node B (50ft, 0) [Generator Leg $L_{gen} = 50ft$]
  * Anchor C (50ft, 20ft) [Absorber Leg $L_{abs} = 20ft$]
* **Material & Condition:** CS, $T_{oper} = 300^\circ F$ (Ambient = $70^\circ F$, $\Delta T = 230^\circ F$)
* **Expected Output (Method 1 - Legacy):**
  * $\Delta X = 50ft \times 12 \text{ in/ft} \times 6.5\times 10^{-6} \times 230 = 0.897$ in
  * Stress ($S_A$) = $\frac{3 E D \Delta X}{144 L_{abs}^2} = \frac{3 \times 29.5\times 10^6 \times 8.625 \times 0.897}{144 \times 20^2} = 11,885$ psi
  * Anchor Force ($F_y$) = $\frac{3 E I \Delta X}{144 L_{abs}^3} = \frac{3 \times 29.5\times 10^6 \times 72.5 \times 0.897}{144 \times 20^3} = 5,000$ lbs
* **Expected Output (Method 2 - 2D BUNDLE):**
  * Anchor Force ($F_y$) = Legacy Force $\times (1 + \mu) = 5000 \times 1.3 = 6,500$ lbs
  * Stress ($S_A$) = Legacy Stress $\times (1 + 0.5\mu) = 11885 \times 1.15 = 13,668$ psi

### 2D-2: Symmetric U-Bend (SI Units)
* **Geometry Setup:**
  * Anchor A (0, 0)
  * Node B (10m, 0)
  * Node C (10m, 5m) [Base/Absorber Leg = 5m]
  * Anchor D (20m, 5m) [Generator Leg 2 = 10m]
* **Material & Condition:** SS316, $T_{oper} = 150^\circ C$
* **Expected Output (Method 1 - Legacy):**
  * Thermal Growth ($\Delta X_{total}$) $\approx 30$ mm (15mm per side from center)
  * Stress ($S_A$) = $\approx 85 \text{ MPa}$ ($12,300 \text{ psi}$)
  * Anchor Force ($F_y$) = $\approx 22 \text{ kN}$ ($5,000 \text{ lbs}$)

### 2D-3: Elaborate Nested Loop (Anchor Load Evaluation)
* **Geometry Setup:** A 100ft straight run broken by an expansion loop.
  * Loop Dimensions: Width ($W$) = 20ft, Depth ($H$) = 15ft.
  * Leg 1 (Generator): 40ft
  * Loop (Absorber): 15ft (Up) -> 20ft (Across) -> 15ft (Down)
  * Leg 2 (Generator): 40ft
* **Expected Engine Action (Method 1 vs Method 2):**
  * **Thermal Expansion ($\Delta$):** The total straight length is 80ft + 20ft = 100ft.
    * $\Delta X = 100ft \times 12 \times 6.5\times 10^{-6} \times 230 = 1.794$ in.
  * **Effective Absorber ($L_{eff}$):** The loop provides $2 \times H = 30ft$ of absorbing length.
    * Stress ($S_A$) = $\frac{3 E D \Delta X}{144 L_{eff}^2} = \frac{3 \times 29.5\times 10^6 \times 8.625 \times 1.794}{144 \times 30^2} = 10,564$ psi.
  * **Anchor Loads:**
    * In a U-Loop, the expansion forces the legs outward, generating a bending moment at the anchors and a shear force across the legs.
    * $F_x$ (Force required to compress the loop) = $\frac{3 E I \Delta X}{144 H^3 \times (\text{Loop Shape Factor})} \approx 4,800$ lbs.
    * **Method 2 (2D BUNDLE):** If the 100ft run is resting on pipe racks, the axial friction against the supports must be overcome before the loop can flex. Anchor Force $F_x = 4,800 + (\mu \times \text{Weight of 100ft Pipe}) = 4,800 + (0.3 \times 2800) = 5,640$ lbs.

---

## Section 2: 3D Solver PCF Benchmarks (Exact Numerics)

### Benchmark 3D-1: Spatial L-Bend (`BM_Calc_3D1_Spatial_L.pcf`)
* **Geometry Setup:**
  * A 3D L-Bend: 30ft run on X-axis, 20ft run on Y-axis, 10ft drop on Z-axis.
* **Expected Output (Method 1 - Legacy):**
  * $\Delta X = 0.54$ in, $\Delta Y = 0.36$ in, $\Delta Z = 0.18$ in.
  * Stress ($S_A$) (Combined): $\approx 14,200$ psi.

### Benchmark 3D-2: Elevation Loop (`BM_Calc_3D2_Elev_Loop.pcf`)
* **Geometry Setup:**
  * 100ft header on X-axis.
  * Interrupted by an elevation loop crossing over an obstacle: 15ft Up (Z), 20ft Across (X), 15ft Down (-Z).
* **Expected Output:**
  * $\Delta X = 1.79$ in.
  * Since the loop is vertical (Z-axis), the bending legs are the 2x 15ft risers.
  * Stress ($S_A$): $10,564$ psi.

### Benchmark 3D-3: Multi-Anchor Branch (`BM_Calc_3D3_Multi_Anchor.pcf`)
* **Geometry Setup:**
  * Header A1 (0,0,0) to A2 (80,0,0) [ft].
  * Branch Tee at (40,0,0) drops to A3 (40, 20, 0) [ft].
* **Expected Output:**
  * **Path 1 (A1 to A2):** $\Delta X = 1.43$ in. Since there are no absorbing legs (straight pipe), Stress ($S_A$) = $\infty$ (Rigidly constrained -> Fails Thermal Stress).
  * **Path 2 (A1 to A3):** The branch (20ft) absorbs the 40ft thermal growth of the header ($\Delta X = 0.72$ in). Stress ($S_A$) = $9,540$ psi.
