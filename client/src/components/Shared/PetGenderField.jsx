import { Form, Select } from "antd";
export default function PetGenderField() {
  return <Form.Item label="Gender" name="gender" rules={[{ required: true, message: "Choose Male, Female, or Unknown." }]}>
    <Select placeholder="Choose pet gender" options={[
      { value: "Male", label: "Male" },
      { value: "Female", label: "Female" },
      { value: "Unknown", label: "Unknown / not yet confirmed" },
    ]} />
  </Form.Item>;
}
