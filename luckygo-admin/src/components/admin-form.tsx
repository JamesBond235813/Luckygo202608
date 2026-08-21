import { Card, Checkbox, Form, Input, InputNumber, Select, Switch } from 'antd';
import type { ReactNode } from 'react';

export const FormSection = ({ title, children }: { title: string; children: ReactNode }) => (
    <Card size="small" title={title} style={{ marginBottom: 16 }}>
        {children}
    </Card>
);

export const TextField = ({
    label,
    value,
    onChange,
    disabled,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}) => (
    <Form.Item label={label} style={{ marginBottom: 16 }}>
        <Input value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </Form.Item>
);

export const NumberField = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
}) => (
    <Form.Item label={label} style={{ marginBottom: 16 }}>
        <InputNumber style={{ width: '100%' }} value={value} onChange={(v) => onChange(Number(v ?? 0))} />
    </Form.Item>
);

export const TextAreaField = ({
    label,
    value,
    onChange,
    rows = 5,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    rows?: number;
}) => (
    <Form.Item label={label} style={{ marginBottom: 16 }}>
        <Input.TextArea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} />
    </Form.Item>
);

export const SelectField = ({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}) => (
    <Form.Item label={label} style={{ marginBottom: 16 }}>
        <Select value={value} options={options} onChange={onChange} />
    </Form.Item>
);

export const CheckboxField = ({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) => (
    <Form.Item style={{ marginBottom: 16 }}>
        <Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)}>
            {label}
        </Checkbox>
    </Form.Item>
);

export const SwitchField = ({
    label,
    checked,
    onChange,
    checkedChildren,
    unCheckedChildren,
    disabled,
}: {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    checkedChildren?: ReactNode;
    unCheckedChildren?: ReactNode;
    disabled?: boolean;
}) => (
    <Form.Item label={label} style={{ marginBottom: 16 }}>
        <Switch
            checked={checked}
            disabled={disabled}
            checkedChildren={checkedChildren}
            unCheckedChildren={unCheckedChildren}
            onChange={onChange}
        />
    </Form.Item>
);
