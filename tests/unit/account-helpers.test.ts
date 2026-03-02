/**
 * Unit tests for account helper utilities
 */

import { describe, it, expect } from 'vitest';
import {
  AccountMaster,
  isDiscountAccount,
  isCurrentAsset,
  isCurrentLiability,
} from '../../utils/account-helpers';

describe('Account Helpers', () => {
  describe('isDiscountAccount', () => {
    it('should identify discount account by name containing "discount"', () => {
      const account: AccountMaster = {
        name: '4350 - Sales Discount',
        account_name: '4350 - Sales Discount',
        account_type: 'Income',
        root_type: 'Income',
        parent_account: 'Sales',
        is_group: 0,
      };
      expect(isDiscountAccount(account)).toBe(true);
    });

    it('should identify discount account by name containing "potongan"', () => {
      const account: AccountMaster = {
        name: '5350 - Potongan Pembelian',
        account_name: '5350 - Potongan Pembelian',
        account_type: 'Cost of Goods Sold',
        root_type: 'Expense',
        parent_account: 'COGS',
        is_group: 0,
      };
      expect(isDiscountAccount(account)).toBe(true);
    });

    it('should identify discount account by parent containing "discount"', () => {
      const account: AccountMaster = {
        name: '4351 - Trade Discount',
        account_name: '4351 - Trade Discount',
        account_type: 'Income',
        root_type: 'Income',
        parent_account: 'Sales Discount',
        is_group: 0,
      };
      expect(isDiscountAccount(account)).toBe(true);
    });

    it('should not identify non-discount account', () => {
      const account: AccountMaster = {
        name: '4100 - Sales Revenue',
        account_name: '4100 - Sales Revenue',
        account_type: 'Income',
        root_type: 'Income',
        parent_account: 'Sales',
        is_group: 0,
      };
      expect(isDiscountAccount(account)).toBe(false);
    });

    it('should handle case-insensitive matching', () => {
      const account: AccountMaster = {
        name: '4350 - SALES DISCOUNT',
        account_name: '4350 - SALES DISCOUNT',
        account_type: 'Income',
        root_type: 'Income',
        parent_account: 'SALES',
        is_group: 0,
      };
      expect(isDiscountAccount(account)).toBe(true);
    });
  });

  describe('isCurrentAsset', () => {
    it('should identify Cash account as current asset', () => {
      const account: AccountMaster = {
        name: '1110 - Petty Cash',
        account_name: '1110 - Petty Cash',
        account_type: 'Cash',
        root_type: 'Asset',
        parent_account: 'Current Assets',
        is_group: 0,
      };
      expect(isCurrentAsset(account)).toBe(true);
    });

    it('should identify Bank account as current asset', () => {
      const account: AccountMaster = {
        name: '1120 - Bank Account',
        account_name: '1120 - Bank Account',
        account_type: 'Bank',
        root_type: 'Asset',
        parent_account: 'Current Assets',
        is_group: 0,
      };
      expect(isCurrentAsset(account)).toBe(true);
    });

    it('should identify Receivable account as current asset', () => {
      const account: AccountMaster = {
        name: '1210 - Accounts Receivable',
        account_name: '1210 - Accounts Receivable',
        account_type: 'Receivable',
        root_type: 'Asset',
        parent_account: 'Current Assets',
        is_group: 0,
      };
      expect(isCurrentAsset(account)).toBe(true);
    });

    it('should identify Stock account as current asset', () => {
      const account: AccountMaster = {
        name: '1310 - Inventory',
        account_name: '1310 - Inventory',
        account_type: 'Stock',
        root_type: 'Asset',
        parent_account: 'Current Assets',
        is_group: 0,
      };
      expect(isCurrentAsset(account)).toBe(true);
    });

    it('should identify Tax account as current asset', () => {
      const account: AccountMaster = {
        name: '1410 - PPN Input',
        account_name: '1410 - PPN Input',
        account_type: 'Tax',
        root_type: 'Asset',
        parent_account: 'Current Assets',
        is_group: 0,
      };
      expect(isCurrentAsset(account)).toBe(true);
    });

    it('should not identify Fixed Asset as current asset', () => {
      const account: AccountMaster = {
        name: '1510 - Equipment',
        account_name: '1510 - Equipment',
        account_type: 'Fixed Asset',
        root_type: 'Asset',
        parent_account: 'Fixed Assets',
        is_group: 0,
      };
      expect(isCurrentAsset(account)).toBe(false);
    });
  });

  describe('isCurrentLiability', () => {
    it('should identify Payable account as current liability', () => {
      const account: AccountMaster = {
        name: '2110 - Accounts Payable',
        account_name: '2110 - Accounts Payable',
        account_type: 'Payable',
        root_type: 'Liability',
        parent_account: 'Current Liabilities',
        is_group: 0,
      };
      expect(isCurrentLiability(account)).toBe(true);
    });

    it('should identify Tax account as current liability', () => {
      const account: AccountMaster = {
        name: '2210 - PPN Output',
        account_name: '2210 - PPN Output',
        account_type: 'Tax',
        root_type: 'Liability',
        parent_account: 'Current Liabilities',
        is_group: 0,
      };
      expect(isCurrentLiability(account)).toBe(true);
    });

    it('should not identify Long-term Liability as current liability', () => {
      const account: AccountMaster = {
        name: '2310 - Long-term Loan',
        account_name: '2310 - Long-term Loan',
        account_type: 'Long Term Liability',
        root_type: 'Liability',
        parent_account: 'Long-term Liabilities',
        is_group: 0,
      };
      expect(isCurrentLiability(account)).toBe(false);
    });

    it('should not identify Equity as current liability', () => {
      const account: AccountMaster = {
        name: '3100 - Capital',
        account_name: '3100 - Capital',
        account_type: 'Equity',
        root_type: 'Equity',
        parent_account: 'Equity',
        is_group: 0,
      };
      expect(isCurrentLiability(account)).toBe(false);
    });
  });
});
