# Device Model Mapping Snapshot

## Usage Rules

- Snapshot query date: 2026-07-30.
- The API returned 29 device models mapped to 10 main models at that time.
- Formal tasks must run a live query. Use this table only for manual verification and API inconsistency troubleshooting.
- Query SDKs and components by main model.
- Determine the default data directory from the main model: use `/data` when it starts with `VF`; otherwise use `/app/data`.
- A submodel must not automatically inherit the physical SKU of its main model.

## Current Mapping

| Device model | Main model | SoC | Type | Default data directory | SDK/component snapshot |
| --- | --- | --- | --- | --- | --- |
| `VF105_V12` | `VF105_V12` | sv810 | Main | `/data` | 2.0: 60; 4.0: 29 |
| `FCV5005` | `VF105_V12` | sv810 | Submodel | `/data` | 2.0: 60; 4.0: 29 |
| `VF300` | `VF105_V12` | sv810 | Submodel | `/data` | 2.0: 60; 4.0: 29 |
| `VF107` | `VF105_V12` | sv810 | Submodel | `/data` | 2.0: 60; 4.0: 29 |
| `FCV4905` | `VF105_V12` | sv810 | Submodel | `/data` | 2.0: 60; 4.0: 29 |
| `FCV4907` | `VF105_V12` | sv810 | Submodel | `/data` | 2.0: 60; 4.0: 29 |
| `DW205_V10` | `DW205_V10` | x2100 | Main | `/app/data` | 2.0: 49; 4.0: not returned |
| `DW205` | `DW205_V10` | x2100 | Submodel | `/app/data` | 2.0: 49; 4.0: not returned |
| `FC6825` | `DW205_V10` | x2100 | Submodel | `/app/data` | 2.0: 49; 4.0: not returned |
| `M350_V11` | `M350_V11` | x1600 | Main | `/app/data` | 2.0: 47; 4.0: not returned |
| `VF203_V12` | `VF203_V12` | sv80x | Main | `/data` | 2.0: 66; 4.0: not returned |
| `MU86_V21` | `MU86_V21` | x1600 | Main | `/app/data` | 2.0: 52; 4.0: not returned |
| `MU86` | `MU86_V21` | x1600 | Submodel | `/app/data` | 2.0: 52; 4.0: not returned |
| `FC7785` | `MU86_V21` | x1600 | Submodel | `/app/data` | 2.0: 52; 4.0: not returned |
| `VF114_V12` | `VF114_V12` | sv80x | Main | `/data` | 2.0: 69; 4.0: not returned |
| `VF124` | `VF114_V12` | sv80x | Submodel | `/data` | 2.0: 69; 4.0: not returned |
| `VF114` | `VF114_V12` | sv80x | Submodel | `/data` | 2.0: 69; 4.0: not returned |
| `FCV4914` | `VF114_V12` | sv80x | Submodel | `/data` | 2.0: 69; 4.0: not returned |
| `VF202_v12` | `VF202_v12` | sv80x | Main | `/data` | 2.0: 63; 4.0: not returned |
| `VF202` | `VF202_v12` | sv80x | Submodel | `/data` | 2.0: 63; 4.0: not returned |
| `FCV5002` | `VF202_v12` | sv80x | Submodel | `/data` | 2.0: 63; 4.0: not returned |
| `DW200_V20` | `DW200_V20` | x2100 | Main | `/app/data` | 2.0: 70; 4.0: not returned |
| `FC6820` | `DW200_V20` | x2100 | Submodel | `/app/data` | 2.0: 70; 4.0: not returned |
| `VF201_V10` | `VF201_V10` | sv810 | Main | `/data` | 2.0: 40; 4.0: not returned |
| `FCV5001` | `VF201_V10` | sv810 | Submodel | `/data` | 2.0: 40; 4.0: not returned |
| `VF201` | `VF201_V10` | sv810 | Submodel | `/data` | 2.0: 40; 4.0: not returned |
| `CC104_V12` | `CC104_V12` | x1600 | Main | `/app/data` | 2.0: 56; 4.0: not returned |
| `FCC4904` | `CC104_V12` | x1600 | Submodel | `/app/data` | 2.0: 56; 4.0: not returned |
| `CC104` | `CC104_V12` | x1600 | Submodel | `/app/data` | 2.0: 56; 4.0: not returned |

The server's current canonical spelling is `VF202_v12`. User input may be matched case-insensitively, but projects must use the value returned by the API.

"4.0: not returned" is only a snapshot fact and must not be hard-coded as permanent lack of support. Run a live query for every task.
