'use client';

import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { FLOW_TYPES } from '@/types';
import styles from './FlowForm.module.css';

const FLOW_TYPE_OPTIONS = FLOW_TYPES.map((ft) => ({
  value: ft,
  label: ft
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' '),
}));

const TARGET_USER_OPTIONS = [
  { value: 'first-time-user', label: 'First-time User' },
  { value: 'returning-customer', label: 'Returning Customer' },
  { value: 'admin', label: 'Admin' },
];

interface FlowFormProps {
  productName: string;
  onProductNameChange: (value: string) => void;
  flowType: string;
  onFlowTypeChange: (value: string) => void;
  targetUsers: string[];
  onTargetUsersChange: (values: string[]) => void;
  keyAction: string;
  onKeyActionChange: (value: string) => void;
  fieldErrors?: Record<string, string | null>;
}

export function FlowForm({
  productName,
  onProductNameChange,
  flowType,
  onFlowTypeChange,
  targetUsers,
  onTargetUsersChange,
  keyAction,
  onKeyActionChange,
  fieldErrors = {},
}: FlowFormProps) {
  return (
    <form className={styles.grid} onSubmit={(e) => e.preventDefault()}>
      <Input
        label="Product Name"
        value={productName}
        onChange={(e) => onProductNameChange(e.target.value)}
        placeholder="e.g. GoalSave"
        maxLength={60}
        required
        error={fieldErrors.productName ?? undefined}
      />

      <Select
        label="Flow Type"
        placeholder="Select flow type"
        options={FLOW_TYPE_OPTIONS}
        value={flowType}
        onChange={(e) => onFlowTypeChange(e.target.value)}
        filled={!!flowType}
        required
        error={fieldErrors.flowType ?? undefined}
      />

      <MultiSelect
        className={styles.fullWidth}
        label="Target User"
        hint="Select all that apply"
        options={TARGET_USER_OPTIONS}
        values={targetUsers}
        onValuesChange={onTargetUsersChange}
        aria-required="true"
      />

      <Input
        className={styles.fullWidth}
        label="Key Action"
        value={keyAction}
        onChange={(e) => onKeyActionChange(e.target.value)}
        placeholder="e.g. Set a savings goal, complete a purchase"
        maxLength={120}
        required
        error={fieldErrors.keyAction ?? undefined}
      />
    </form>
  );
}
