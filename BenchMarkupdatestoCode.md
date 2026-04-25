# Changes Made During Benchmark Process

The benchmark tests verify the functionality of the GC3D calculation and SIF engines. Below is a summary of the expected inputs and logic derived from the calculation scripts:

1. **`sectionProperties` (GC3DCalcEngine.js)**
   - Computes inner diameter, moment of inertia, section modulus, and mean radius based on outer diameter and wall thickness.

2. **`thermalDisplacement` (GC3DCalcEngine.js)**
   - Calculates thermal expansion displacement using coefficient of thermal expansion, run length, and temperature change.

3. **`gcBasic` (GC3DCalcEngine.js)**
   - Calculates force, moment, and bending stress for a single leg absorbing displacement.

4. **`gcWithFlexibility` (GC3DCalcEngine.js)**
   - Modified guided cantilever method considering elbow flexibility. It recalculates force, moment, and bending stress based on the flexibility factor and elbow radius.

5. **`intensifiedStress` (GC3DCalcEngine.js)**
   - Calculates the intensified stress using in-plane SIF, bending moment, and section modulus.

6. **`combineStressAtNode` (GC3DCalcEngine.js)**
   - Calculates combined bending stress from multiple connected legs.

7. **`allowableStress` (GC3DCalcEngine.js)**
   - Computes allowable stress according to ASME B31.3 Eq 1a.

8. **`requiredLegLength` (GC3DCalcEngine.js)**
   - Computes the required absorbing leg length based on displacement, stress limits, and SIF.

9. **`stressCheck` (GC3DCalcEngine.js)**
   - Determines if the combined stress ratio passes or fails the allowable limit.

10. **`elbowSIF` (GC3DSIFEngine.js)**
    - Computes flexibility characteristic, flexibility factor, and SIFs for elbows based on B31.3 Appendix D.

11. **`unreinforcedTeeSIF` (GC3DSIFEngine.js)**
    - Computes flexibility characteristic, flexibility factor, and SIFs for unreinforced tees.

12. **`getSIFData` (GC3DSIFEngine.js)**
    - Helper function that evaluates a component type and determines the applicable SIFs.

No zero error was found after importing the output PCF, since PCF import was outside the scope of the benchmark test module logic.
