# WealthOS - Enterprise Financial Engine & Local-First Personal Wealth OS

WealthOS is a production-grade, local-first personal finance system operating as a silent Chartered Accountant under the hood. It strictly enforces double-entry bookkeeping, 64-bit micro-unit integer precision, real-time portfolio XIRR, loan amortization, credit card statement tracking, debt graph simplification, and automated receipt/SMS ingestion.

## Directory Structure
```
WealthOS_Engine/
├── .cursorrules                       # Master AI prompt & engineering rules
├── README.md                          # Quickstart & architecture overview
├── docs/
│   └── MASTER_SPEC.md                 # Complete system specifications & CA rules
├── database/
│   └── migrations/
│       └── 001_initial_schema.sql     # Full SQLite schema with strict integrity constraints
├── core/
│   ├── financial-engine/
│   │   ├── types.py                   # Type definitions & micro-unit conversions
│   │   ├── xirr.py                    # Newton-Raphson XIRR numerical calculator
│   │   └── tax_engine.py              # FIFO lot tracker & Old vs New tax regime engine
│   ├── ledger/
│   │   ├── ledger_engine.py           # Double-entry posting service & validation
│   │   └── capex.py                   # Straight-line & WDV depreciation scheduler
│   ├── debt/
│   │   ├── loan_calculator.py         # Exact EMI & prepayment simulator
│   │   └── graph_simplifier.py        # Min-cash-flow greedy heap debt simplifier
│   └── ingestion/
│       └── sms_parser.py              # Regex + deduplication hash pipeline
└── tests/
    └── test_all_modules.py            # Comprehensive test suite covering all checkpoints
```

## Running Tests
Run the standalone test suite:
```bash
python tests/test_all_modules.py
```
