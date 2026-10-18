import { useState } from "react";
import { Alert, Button, Form, Input, Modal, Radio, Select } from "antd";
import { useNavigate } from "react-router-dom";
import { api, dayKey, errorMessage, formatPetGender } from "../../api";
import { useResource } from "../Shared/UI";
import PetRegistrationFields from "../Shared/PetRegistrationFields";
export default function EmergencyConsultation({ open, onClose }) {
  const [form] = Form.useForm();
  const mode = Form.useWatch("mode", form) || "existing";
  const contactMode = Form.useWatch("contactMode", form) || "new";
  const pets = useResource("/pets");
  const owners = useResource("/users");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [existing, setExisting] = useState("");
  const [existingStatus, setExistingStatus] = useState("");
  const navigate = useNavigate();
  const [requestId] = useState(() => crypto.randomUUID());
  const save = async (values) => {
    setBusy(true);
    setError("");
    setExisting("");
    try {
      const payload = {
        reasonForVisit: values.reasonForVisit,
        requestId,
        ...(mode === "existing"
          ? { pet: values.pet }
          : {
              registration: {
                name: values.name,
                species: values.species,
                breed: values.breed,
                gender: values.gender,
                otherSpecies: values.otherSpecies,
                birthDate: values.birthDate,
              },
              ...(contactMode === "existing"
                ? { owner: values.owner }
                : {
                    contact: {
                      name: values.contactName,
                      phone: values.contactPhone,
                      address: values.contactAddress,
                    },
                  }),
            }),
      };
      const { data } = await api.post("/consultations/emergency", payload);
      onClose();
      navigate(`/admin/consultations/${data._id}`);
    } catch (e) {
      setError(errorMessage(e));
      setExisting(e.response?.data?.errors?.existingAppointment || "");
      setExistingStatus(e.response?.data?.errors?.existingStatus || "");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Start emergency consultation"
      open={open}
      onCancel={onClose}
      width={760}
      footer={null}
      destroyOnClose
    >
      <p>
        Create an emergency visit now. Existing patients keep their original
        medical record. A new patient can be recorded without a login account.
      </p>
      {error && <Alert type="error" message={error} />}
      {existing && (
        <Button
          onClick={() => {
            onClose();
            navigate(
              existingStatus === "Pending"
                ? `/admin/approvals/${existing}`
                : `/admin/consultations/${existing}`,
            );
          }}
        >
          Review existing visit
        </Button>
      )}
      <Form
        form={form}
        layout="vertical"
        onFinish={save}
        initialValues={{ mode: "existing", contactMode: "new", species: "Dog", gender: "Unknown" }}
        onValuesChange={(changed) => {
          if (changed.species)
            form.setFieldsValue({ breed: undefined, otherSpecies: "" });
        }}
      >
        <Form.Item name="mode" label="Patient record">
          <Radio.Group
            options={[
              { value: "existing", label: "Existing pet" },
              { value: "new", label: "New pet / no account" },
            ]}
          />
        </Form.Item>
        {mode === "existing" ? (
          <Form.Item
            name="pet"
            label="Select existing pet"
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              loading={pets.loading}
              options={pets.data.map((p) => ({
                value: p._id,
                label: `${p.name} · ${p.owner?.name || "Owner"} · ${p.breed} · ${formatPetGender(p)}`,
              }))}
            />
          </Form.Item>
        ) : (
          <>
            <Form.Item name="contactMode" label="Owner/contact">
              <Radio.Group
                options={[
                  { value: "new", label: "New contact (no login)" },
                  { value: "existing", label: "Existing owner/contact" },
                ]}
              />
            </Form.Item>
            {contactMode === "existing" ? (
              <Form.Item
                name="owner"
                label="Select owner/contact"
                rules={[{ required: true }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={owners.data.map((o) => ({
                    value: o._id,
                    label: `${o.name} · ${o.phone || "No phone"}${o.accountType === "guest" ? " · Guest contact" : ""}`,
                  }))}
                />
              </Form.Item>
            ) : (
              <div className="two-columns">
                <Form.Item
                  name="contactName"
                  label="Owner/contact name"
                  rules={[{ required: true, min: 2, max: 80 }]}
                >
                  <Input placeholder="Enter name, or Unknown owner" />
                </Form.Item>
                <Form.Item
                  name="contactPhone"
                  label="Contact mobile (optional)"
                  rules={[
                    {
                      pattern: /^(09\d{9}|\+639\d{9})$/,
                      message: "Use 09XXXXXXXXX or +639XXXXXXXXX.",
                    },
                  ]}
                >
                  <Input inputMode="tel" />
                </Form.Item>
                <Form.Item
                  name="contactAddress"
                  label="Address (optional)"
                  rules={[{ max: 300 }]}
                >
                  <Input />
                </Form.Item>
              </div>
            )}
            <div className="two-columns">
              <Form.Item
                name="name"
                label="Pet name"
                rules={[{ required: true, max: 80 }]}
              >
                <Input placeholder="Patient name" />
              </Form.Item>
              <PetRegistrationFields form={form} />
              <Form.Item name="birthDate" label="Birth date (if known)">
                <Input type="date" max={dayKey()} />
              </Form.Item>
            </div>
          </>
        )}
        <Form.Item
          name="reasonForVisit"
          label="Emergency concern"
          rules={[{ required: true, min: 5, max: 2000 }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Describe the urgent concern and initial observations."
          />
        </Form.Item>
        <div className="row end">
          <Button onClick={onClose}>Back</Button>
          <Button type="primary" htmlType="submit" loading={busy}>
            Start emergency visit
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
