

Breaking down of 3D geometry.
Need to add module to break down 3D geometry based on Anchor location.
Create a MOCK pcf, called "MockforSimplified.pcf" based on "Example — resolving to L:" (Described here)

Create new tab near 3D editor called "Simp. Analysis", Here show 2D geometry which is derived from 3D geometry ("Example — resolving to L:") based on smart2Dconverter.

"Simp. Analysis" Tab will have break down of 2D shapes from 3D editor. But for now use MockforSimplified.pcf data

Purpose of this tab: 2D geometry shown will be used to calculate stress and display to user using formulas.
Information that will be used in downstream are (For information): 
L-Bend:
Generator leg:  L_gen (its expansion must be absorbed)
Absorber leg:   L_abs (must satisfy: L_abs ≥ L_required by GC formula)

Expansion to absorb: Δ = α × L_gen
Required absorber:   L_req = C × √(OD × Δ)
Check:               L_abs ≥ L_req  ?


smart2Dconverter:
(1) Rules for Profile "L-Bend":
STEP 1 — Remove Legs Too Short to Matter
What this means to you as an engineer:
Every real pipe run has short stubs — a 150mm drop to a valve, a 200mm connection piece between two fittings. These are too short to meaningfully contribute either expansion or flexibility to the system. Counting them just adds noise and makes the system look more complex than it is.
This step removes them before analysis begins.
The rule: Any leg shorter than 3 × pipe OD is considered negligible.
Example:
10" pipe → OD = 273mm → threshold = 273 × 3 = 819mm

Any leg shorter than 819mm → removed from analysis.
Its expansion is too small to matter.
Its flexibility contribution is too small to matter.
What changes in the system after removal:
BEFORE:
[A1] ──(Y, 200mm)── node ──(Z, 6000mm)── elbow ──(X, 4000mm)── [A2]
         ↑ SHORT — remove

AFTER:
[A1] ──(Z, 6000mm)── elbow ──(X, 4000mm)── [A2]
         → This is now a clean L. Check as Group A.

Machine detail:
For each leg in sequence:
    if leg.length < 3 * pipe_OD:
        mark leg as NEGLIGIBLE
        remove from active leg list
        merge its two adjacent nodes into one
        note: its expansion contribution is added to the 
              nearest significant leg in the same direction
              if one exists, otherwise discarded

STEP 2 — Merge Legs Running in the Same Direction
What this means to you as an engineer:
Sometimes a pipe runs in the same direction for a long distance but has intermediate nodes in the data — maybe at a support point, a valve, or simply because the drawing was modelled in segments. These are not real direction changes. Two X-legs going the same way (+X then +X) are really just one longer X-leg.
This step merges them into one so the system looks as simple as it truly is.
The rule: Two consecutive legs on the same axis going the same direction → merge into one leg of combined length.
Example:
BEFORE:
[A1] ──(+X, 3000)── [support] ──(+X, 2000)── elbow ──(+Y, 6000)── [A2]

AFTER MERGE:
[A1] ──(+X, 5000)── elbow ──(+Y, 6000)── [A2]
         → Clean L. Check as Group A.
What does NOT get merged:
[A1] ──(+X, 3000)── elbow ──(+Y, 500 — negligible)── elbow ──(+X, 2000)── elbow ──(+Y, 6000)── [A2]

The Y, 500mm leg sits between two X-legs.
After Step 1 removes the short Y-leg, the two X-legs become adjacent.
THEN Step 2 merges them.

Steps must run in order: 1 first, then 2.

Machine detail:
Scan leg sequence from A1 to A2:
    For each pair of consecutive legs (Leg_i, Leg_i+2):
        if Leg_i.axis == Leg_i+2.axis 
           AND Leg_i.sign == Leg_i+2.sign
           AND Leg_i+1 is marked NEGLIGIBLE:
               merged_leg.length = Leg_i.length + Leg_i+2.length
               merged_leg.axis = Leg_i.axis
               merged_leg.sign = Leg_i.sign
               replace Leg_i, Leg_i+1, Leg_i+2 with merged_leg
               repeat scan until no more merges possible

STEP 3 — Split at Real Anchors
What this means to you as an engineer:
An anchor completely fixes the pipe — it cannot move in any direction. This means the pipe on one side of the anchor has absolutely no knowledge of what the pipe on the other side is doing thermally. The two sides do not communicate forces or moments across the anchor.
So any time there is an anchor in the middle of a run, you cut the system there. Each piece between two anchors is its own independent problem.
The rule: Split the system at every intermediate anchor. Each resulting sub-system between two anchors is checked independently.
Example:
BEFORE:
[A1] ──(X, 4000)── [ANCHOR] ──(Y, 6000)── elbow ──(X, 3000)── [A2]

Split at intermediate anchor:

SUB-SYSTEM 1:          SUB-SYSTEM 2:
[A1] ──(X, 4000)── [ANCHOR]    [ANCHOR] ──(Y, 6000)── elbow ──(X, 3000)── [A2]

Sub-system 1: single leg — just check the anchor load.
Sub-system 2: TWO legs, ONE elbow → this is an L. Check as Group A.
Important: After splitting, each sub-system goes back to Step 1 and restarts the full reduction process independently.

Machine detail:
Scan leg sequence for nodes of type = ANCHOR (full restraint):
    If intermediate anchor found at node_i:
        Split sequence into:
            Sub-system A: A1 → node_i
            Sub-system B: node_i → A2
        Add both sub-systems to processing queue
        Process each sub-system independently from Step 1
        
Note: End anchors (A1 and A2) are the boundary conditions — they do not cause splits.
Only intermediate anchors between A1 and A2 cause splits.

STEP 4 — Split at Guide + Line Stop Combinations
What this means to you as an engineer:
A guide alone does not fully fix the pipe — it still allows axial movement. A line stop alone does not fully fix the pipe — it still allows lateral movement. But when both are applied at the same point on the same leg, together they constitute a full anchor — the pipe cannot go anywhere.
More precisely: a guide creates a virtual anchor — but only when the leg on the other side of the nearest elbow runs in the same direction that the guide is arresting.
Why the direction must match:
GUIDE arrests Y-movement:

     VALID SPLIT                       NO SPLIT
         ↓                                 ↓

[A1] ──── = ──── ┐            [A1] ──── = ──── ┐
                 │  (Y-leg)                     └ ─ ─ ─ [A2]
                 │                                  (Z-leg, into page)
                [A2]

Guide arrests Y.              Guide arrests Y.
Next leg runs in Y.           Next leg runs in Z.
Guide blocks the              Guide does nothing to
elbow from moving             stop Z-movement.
in Y. → Virtual anchor.       No virtual anchor.
The rule: A guide on a leg creates a valid split point — a virtual anchor — only if the leg immediately after the next elbow runs parallel to the axis the guide is arresting.
Example:
Z-BEND:

[A1] ──(X, 3000)── = ──(X, 2000)── ┐
                   ↑                │ (Y, 6000)
                 GUIDE              │
               arrests Y            └──(X, 3000)── [A2]

Guide arrests Y. Leg after nearest elbow runs in Y. → VALID SPLIT.

Creates virtual anchor at guide position. System downstream:

[VIRTUAL A] ──(X, 2000)── ┐
                           │ (Y, 6000)
                           └──(X, 3000)── [A2]
            → This is a Z-bend, not an L.
            → But if guide were AT the elbow: 
              downstream would be a clean L.

Machine detail:
For each node of type = GUIDE in the leg sequence:
    guide_arrested_axis = axis perpendicular to the leg the guide sits on
    
    Find the next elbow downstream of this guide:
        next_leg_after_elbow = leg immediately following that elbow
        
    If next_leg_after_elbow.axis == guide_arrested_axis:
        VALID SPLIT
        Create virtual anchor node at guide position
        Split system: upstream sub-system and downstream sub-system
        Add both to processing queue, restart from Step 1
        
    Else:
        NO SPLIT
        Mark guide as NOTED_BUT_INACTIVE for this flexibility plane
        Flag to user: "Guide present but not effective for flexibility 
                       in this plane — may serve other purpose 
                       (vibration, wind). Verify intent."
        Continue without splitting
        
Note on Line Stop + Guide together:
    If node has BOTH guide AND line_stop attributes:
        This = full anchor → handle in Step 3, not Step 4

STEP 5 — Cancel Opposing Legs on the Same Axis
What this means to you as an engineer:
When a pipe goes, say, 4000mm in +X and then later 4000mm in -X, those two expansions cancel each other at the anchor. The anchor sees zero net X-movement. From the anchor's perspective, the pipe is not trying to push in X at all.
When an axis is fully cancelled this way, that entire direction disappears from the flexibility problem. The system becomes simpler — sometimes simple enough to be an L.
The rule: Compute the net signed length in each axis. If any axis nets to zero (or negligibly small), remove it from the active problem.
Example:
SYSTEM:
[A1] ──(+Y, 3000)── elbow ──(+X, 6000)── elbow ──(-Y, 3000)── elbow ──(+Z, 4000)── [A2]

Net expansion per axis:
    ΔX = α × 6000
    ΔY = α × (3000 - 3000) = 0   ← cancelled
    ΔZ = α × 4000

Y cancels completely. Y-legs still physically exist
but they contribute no NET expansion to the anchor.

Active axes remaining: X and Z only.

XZ projection:
[A1] ──(X, 6000)── elbow ──(Z, 4000)── [A2]
(Y-legs collapse to points — they cancel out)

→ This is a clean L in the XZ plane. Check as Group A.
Important distinction:
Cancelled axis ≠ no legs in that axis.

The Y-legs are still physically there.
They still contribute flexibility (they can flex in X and Z).
But their NET thermal push on the anchors is zero.
The anchor does not need to resist Y-expansion.
The flexibility problem in Y vanishes.

Machine detail:
For each axis in [X, Y, Z]:
    net_length[axis] = Σ (sign × length) for all legs on that axis
    net_expansion[axis] = alpha × net_length[axis]
    
    if abs(net_expansion[axis]) < epsilon:  # epsilon = 1mm threshold
        mark axis as CANCELLED
        legs on this axis become PASSIVE 
        (physically present, contribute flexibility but not expansion)
        
Active axes = axes where net_expansion > epsilon
Active planes = planes where BOTH constituent axes are active

Note: Passive legs on cancelled axes are still available as absorbers
      in the planes where they appear. Do not remove them from geometry.
      Only remove their expansion contribution from the load vector.



Example — resolving to L:
After all steps complete:

Original system had 5 legs.
Step 1 removed 2 short legs.
Step 5 cancelled Y-axis (equal opposing legs).
Step 2 merged 2 collinear X-legs.

REMAINING: 2 legs — X (4000mm) and Z (3000mm).
TWO legs, TWO directions → L confirmed.
Check as Group A in XZ plane.


(2) Other profiles: TBA

Other rules will be provided later.

