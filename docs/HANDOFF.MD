# Handoff

Goal: three-layer anti-counterfeiting research prototype (QR + emulated NFC, blockchain registry, ML scan-risk, fusion), 
extending the paper "A Holistic Anti-Counterfeiting Platform Using NFC and Blockchain" (CMC 2025, HACP5).

Done and committed: contract (Truffle/Ganache, 43 tests), identity modules + HACP5 baseline + race experiment (67 tests), 
FastAPI + MySQL backend with fusion (55 tests), scan simulator + ML training, React frontend (build-tested only).
Not done: Phase 7 experiments (run_all.py incomplete), Phase 8 image signal, final docs, honest ML evaluation.

Environment: Windows, Python 3.11 in backend/.venv, Node 24, Truffle 5.11.5, Ganache [port]. 
MySQL user ac_user, databases anticounterfeit and anticounterfeit_test. Credentials only in .env.
Contract address: [address]. Never use the MySQL root account. No real keys anywhere.

Rules: never invent results; every number comes from a script; write UTF-8; no emojis in Python prints; 
commit after each step; state clearly that NFC and scan data are simulated.

Image-signal code lives outside this repo in C:\Project-MF\ml (embedder.py, sop_eval_core.py, sop_eval.ipynb), 
dataset in C:\Project-MF\Stanford_Online_Products.

Known problems: ML results are too perfect (F1 = 1.000), only one seed, rule baseline ignores the NFC counter, 
UI never opened in a browser.