import { Alert, Button, Form, Input, Select } from 'antd';
import PetGenderField from './PetGenderField';
import { useResource } from './UI';

export default function PetRegistrationFields({ form }) {
  const species = Form.useWatch('species', form) || 'Dog';
  const breeds = useResource(`/pet-options?species=${encodeURIComponent(species)}`);
  return (
    <>
      <Form.Item label="Species" name="species" rules={[{ required: true }]}>
        <Select options={['Dog', 'Cat', 'Other'].map(value => ({ value, label: value }))} />
      </Form.Item>
      {species === 'Other' && (
        <Form.Item label="Specify species" name="otherSpecies" rules={[{ required: true, whitespace: true, max: 80, message: 'Enter the animal species, for example Rabbit or Bird.' }]}>
          <Input placeholder="For example Rabbit, Bird, or Hamster" maxLength={80} />
        </Form.Item>
      )}
      <Form.Item label="Breed" name="breed" rules={[{ required: true, max: 80 }]} extra={species === 'Other' ? 'Enter Unknown if you are unsure.' : 'Search the list. Choose Mixed breed or Unknown when unsure.'}>
        {species === 'Other' ? <Input placeholder="Breed or Unknown" maxLength={80} /> : (
          <Select showSearch optionFilterProp="label" loading={breeds.loading} disabled={breeds.loading} placeholder={`Choose a ${species.toLowerCase()} breed`} options={(breeds.data.species === species ? breeds.data.breeds || [] : []).map(value => ({ value, label: value }))} />
        )}
      </Form.Item>
      <PetGenderField />
      {breeds.error && species !== 'Other' && <Alert type="error" message={breeds.error} action={<Button onClick={breeds.refresh}>Retry</Button>} />}
    </>
  );
}
