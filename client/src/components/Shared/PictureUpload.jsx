import { useId, useState } from "react";
import { Alert } from "antd";
export async function readPetPicture(file, maxDimension = 1400) {
  if (!file) return "";
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 15 MB.");
  if (
    !file.type.startsWith("image/") &&
    !/\.(png|jpe?g|webp|avif|heic|heif)$/i.test(file.name)
  )
    throw new Error("Choose a pet photo in JPG, PNG, WebP, or AVIF format.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () =>
        reject(
          new Error(
            "This photo format cannot be opened. Export it as JPG or PNG and try again.",
          ),
        );
    });
    const scale = Math.min(
      1,
      maxDimension / Math.max(img.naturalWidth, img.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    let result = canvas.toDataURL("image/webp", 0.85);
    if (result.length > 2500000) result = canvas.toDataURL("image/webp", 0.65);
    if (result.length > 2700000)
      throw new Error("This photo is too large. Choose a smaller image.");
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}
export default function PictureUpload({ value, onChange, disabled = false, label = "Pet photo", maxDimension = 1400 }) {
  const id = useId();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const upload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setWorking(true);
    setError("");
    try {
      await onChange(await readPetPicture(file, maxDimension));
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
      event.target.value = "";
    }
  };
  return (
    <div className="pet-photo-upload">
      <label htmlFor={id}>{label}</label>
      {value && (
        <img src={value} alt={`Selected ${label.toLowerCase()}`} className="pet-photo-preview" />
      )}
      <input
        id={id}
        type="file"
        accept="image/*"
        aria-label={`Choose ${label.toLowerCase()}`}
        onChange={upload}
        disabled={disabled || working}
      />
      <small className="muted">
        JPG, PNG, WebP or AVIF. Large photos are resized automatically.
      </small>
      {working && <small role="status">Preparing photo…</small>}
      {error && <Alert type="error" message={error} />}
    </div>
  );
}
