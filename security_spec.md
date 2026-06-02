# Firestore Security Specification - SILOLAB PRIMA

This document outlines the security architecture, invariants, and threat vectors for the SILOLAB PRIMA Firestore database.

## 1. Data Invariants

- **Auth Requirement**: By default, all read and write operations require a verified authenticated session (`request.auth.uid != null`).
- **Data Integrity**: All key identifier fields like NIP, kodeBarang, stock IDs must be size-bounded and strictly validated.
- **Timestamp Integrity**: All mutations and transactions of historic records should have server-verifiable audit timestamps where needed, or strict formatting properties.
- **Privilege Integrity**: Standard users cannot overwrite master records or change sensitive identifiers.

## 2. The "Dirty Dozen" Threat Payloads

The ruleset blocks the following high-stakes attack vectors:

1. **Unauthenticated Read / List Attempt**: Accessing `barang` or `mutasi` without being signed in.
2. **Missing Verified Email Attack**: Accessing read/write routes with a spoofed account where `email_verified == false` (if strict email verification is configured).
3. **ID Injection Poisoning**: Creating documents with multi-megabyte string IDs to consume project quota/wallet.
4. **Incorrect Shape Injection**: Attempting to save a `barang` entry missing `satuan` or with a text array under `stokMinimum` instead of a number.
5. **Malicious Actor Spoofing**: Attempting to insert a mutasi log specifying another user's NIP / name as the operator.
6. **State Shortcutting**: Modifying the `status` field of a `PermintaanBarang` directly from "Diproses" to "Diterima Penuh" without checking actual quantities. Handled by exact update validation checks.
7. **Phantom Stock Deduction**: Attempting to write a negative value or string under `stok.{id}.jumlah` to crash stock calculations.
8. **Shadow Field Injection**: Writing helper attributes (like `_isAdmin: true`) into a `Pegawai` record.
9. **Relational Invariant Bypass**: Inserting a `mutasi` entry referencing a non-existent `kodeBarang` (should be checked on create via UI or rules checks if relational validation is applied).
10. **Immortal Field Corruption**: Updating a historic `MutasiBarang` to modify `jumlah` or `jenis` retrospectively.
11. **Denial-of-Wallet DB Flooding**: Overloading collection lists with expensive unindexed queries.
12. **PII Extraction Attempt**: Listing and dumping full employee/pegawai documents without authenticating as an active employee.

## 3. Test Runner Design Guidelines

All Firestore writes are gated under strict schema functions. Direct client updates to finalized transactions are blocked. Tests can be executed using standard security rules simulators.
