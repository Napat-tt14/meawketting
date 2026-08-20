"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import {
  ArrowClockwise,
  Camera,
  Cat,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Dog,
  ImagePlus,
  Info,
  Save,
  Swatches,
  Trash,
  Video,
  X,
} from "../_components/icons";
import { useDraftPassport, type PetSpecies } from "./DraftPassportContext";

const acceptedFileTypes = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type PhotoError = {
  title: string;
  message: string;
  preservation: string;
};

type CameraState = "closed" | "requesting" | "ready";
type CropSource = {
  dataUrl: string;
  fileName: string;
  originalDataUrl: string;
  width: number;
  height: number;
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("invalid result"));
    reader.onerror = () => reject(new Error("file read failed"));
    reader.readAsDataURL(file);
  });
}

function validateImageDecode(dataUrl: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = document.createElement("img");
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("image decode failed"));
    image.src = dataUrl;
  });
}

export function PhotoUploadStep() {
  const router = useRouter();
  const { draft, hydrated, setPhoto, updateDetails } = useDraftPassport();
  const inputId = useId();
  const helpId = useId();
  const errorId = useId();
  const nameId = useId();
  const nameErrorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const photoPickerRef = useRef<HTMLDivElement>(null);
  const photoActionsRef = useRef<HTMLDivElement>(null);
  const photoActionsTriggerRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<PhotoError | null>(null);
  const [loadedPhotoSrc, setLoadedPhotoSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [cameraState, setCameraState] = useState<CameraState>("closed");
  const [nameError, setNameError] = useState<string | null>(null);
  const [cropSource, setCropSource] = useState<CropSource | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [photoActionsOpen, setPhotoActionsOpen] = useState(false);
  const cropPointerRef = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);
  const cropPointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);

  const photoReady = Boolean(draft.photo && loadedPhotoSrc === draft.photo.dataUrl);
  const cropBaseScale = cropSource ? Math.max(1 / cropSource.width, 1 / cropSource.height) : 1;
  const cropPreviewWidth = cropSource ? cropSource.width * cropBaseScale * cropZoom : 1;
  const cropPreviewHeight = cropSource ? cropSource.height * cropBaseScale * cropZoom : 1;
  const cropPreviewOffsetX = (cropX / 100) * Math.max(0, cropPreviewWidth - 1) * 100;
  const cropPreviewOffsetY = (cropY / 100) * Math.max(0, cropPreviewHeight - 1) * 100;

  function validateName() {
    if (!draft.petName.trim()) {
      setNameError("กรุณาใส่ชื่อน้องก่อนดู Passport");
      return false;
    }
    setNameError(null);
    return true;
  }

  function guideTo(ref: React.RefObject<HTMLElement | null>) {
    window.requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      ref.current?.focus({ preventScroll: true });
    });
  }

  function selectSpecies(species: PetSpecies) {
    updateDetails({ species });
  }

  function closePhotoActions() {
    setPhotoActionsOpen(false);
  }

  function resetCrop() {
    setCropZoom(1);
    setCropX(0);
    setCropY(0);
  }

  async function openCropEditor(dataUrl: string, fileName: string, originalDataUrl: string) {
    setError(null);
    setIsProcessing(true);
    try {
      const dimensions = await validateImageDecode(dataUrl);
      setCropSource({ dataUrl, fileName, originalDataUrl, ...dimensions });
      resetCrop();
    } catch {
      setError({
        title: "เปิดเครื่องมือจัดภาพไม่สำเร็จ",
        message: "ลองเลือกรูปใหม่ หรือเปิดเครื่องมือจัดภาพอีกครั้ง",
        preservation: "รูปและข้อมูลเดิมยังอยู่ครบ",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  function handleCropPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    cropPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (cropPointersRef.current.size === 2) {
      const points = [...cropPointersRef.current.values()];
      pinchRef.current = { distance: Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y), zoom: cropZoom };
      cropPointerRef.current = null;
      return;
    }
    cropPointerRef.current = { startX: event.clientX, startY: event.clientY, x: cropX, y: cropY };
  }

  function handleCropPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (cropPointersRef.current.has(event.pointerId)) cropPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (cropPointersRef.current.size >= 2 && pinchRef.current) {
      const points = [...cropPointersRef.current.values()];
      const distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
      setCropZoom(Math.max(1, Math.min(2.5, pinchRef.current.zoom * (distance / Math.max(1, pinchRef.current.distance)))));
      return;
    }
    const start = cropPointerRef.current;
    if (!start) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const nextX = start.x + ((event.clientX - start.startX) / rect.width) * 100;
    const nextY = start.y + ((event.clientY - start.startY) / rect.height) * 100;
    setCropX(Math.max(-50, Math.min(50, nextX)));
    setCropY(Math.max(-50, Math.min(50, nextY)));
  }

  function endCropPointer(event: ReactPointerEvent<HTMLButtonElement>) {
    cropPointersRef.current.delete(event.pointerId);
    if (cropPointersRef.current.size < 2) pinchRef.current = null;
    cropPointerRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleCropKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 10 : 4;
    if (event.key === "ArrowLeft") setCropX((value) => Math.max(-50, value - step));
    if (event.key === "ArrowRight") setCropX((value) => Math.min(50, value + step));
    if (event.key === "ArrowUp") setCropY((value) => Math.max(-50, value - step));
    if (event.key === "ArrowDown") setCropY((value) => Math.min(50, value + step));
    if (event.key === "+" || event.key === "=") setCropZoom((value) => Math.min(2.5, value + 0.05));
    if (event.key === "-") setCropZoom((value) => Math.max(1, value - 0.05));
    if (event.key === "Home" || event.key === "0") resetCrop();
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-", "Home", "0"].includes(event.key)) event.preventDefault();
  }

  useEffect(() => {
    if (!photoActionsOpen) return;

    function closeOnOutside(event: PointerEvent) {
      if (!photoActionsRef.current?.contains(event.target as Node)) setPhotoActionsOpen(false);
    }

    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      setPhotoActionsOpen(false);
      photoActionsTriggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [photoActionsOpen]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState("closed");
  }

  async function processPhoto(file?: File) {
    if (!file || isProcessing) return;

    if (!acceptedFileTypes.includes(file.type)) {
      setError({
        title: "ไฟล์นี้ยังใช้ไม่ได้",
        message: "กรุณาเลือกไฟล์ JPG, PNG หรือ WebP แล้วลองอีกครั้ง",
        preservation: "ชื่อและชนิดสัตว์ที่กรอกไว้ใน Draft จะไม่ถูกล้าง",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError({
        title: "รูปนี้ใหญ่ไปนิด",
        message: "เลือกไฟล์ไม่เกิน 10 MB แล้วลองอีกครั้งนะ",
        preservation: "รูปเดิมและข้อมูลที่กรอกไว้ยังอยู่ครบ",
      });
      return;
    }

    setError(null);
    setLoadedPhotoSrc(null);
    setIsProcessing(true);

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const dimensions = await validateImageDecode(dataUrl);
      setCropSource({ dataUrl, fileName: file.name || "camera-photo.jpg", originalDataUrl: dataUrl, ...dimensions });
      setCropZoom(1);
      setCropX(0);
      setCropY(0);
    } catch {
      setPhoto(null);
      setError({
        title: "เปิดรูปนี้ไม่ได้",
        message: "ไฟล์อาจเสียหรือเบราว์เซอร์อ่านภาพนี้ไม่สำเร็จ กรุณาเลือกรูปอื่น",
        preservation: "ข้อมูลชื่อและชนิดสัตว์เดิมยังอยู่ใน Draft",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  async function applyCrop() {
    if (!cropSource || isProcessing) return;
    setIsProcessing(true);
    try {
      const image = document.createElement("img");
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("crop image failed"));
        image.src = cropSource.dataUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1200;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("crop canvas unavailable");
      const baseScale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
      const scale = baseScale * cropZoom;
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      const travelX = Math.max(0, width - canvas.width);
      const travelY = Math.max(0, height - canvas.height);
      const x = (canvas.width - width) / 2 + (cropX / 100) * travelX;
      const y = (canvas.height - height) / 2 + (cropY / 100) * travelY;
      context.drawImage(image, x, y, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setPhoto({ dataUrl, fileName: cropSource.fileName, originalDataUrl: cropSource.originalDataUrl });
      setCropSource(null);
      setLoadedPhotoSrc(null);
    } catch {
      setError({
        title: "Crop รูปไม่สำเร็จ",
        message: "ลองจัดรูปใหม่ หรือเลือกรูปอื่นแทน",
        preservation: "ชื่อและชนิดสัตว์ยังอยู่ครบ",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  function removePhoto() {
    setPhoto(null);
    setLoadedPhotoSrc(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleImageError() {
    setPhoto(null);
    setLoadedPhotoSrc(null);
    setError({
      title: "ตัวอย่างรูปเปิดไม่สำเร็จ",
      message: "รูปนี้ไม่พร้อมใช้กับ Draft กรุณาเลือกรูปใหม่แล้วลองอีกครั้ง",
      preservation: "ชื่อและชนิดสัตว์ที่กรอกไว้ยังไม่หาย",
    });
  }

  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError({
        title: "อุปกรณ์นี้ยังเปิดกล้องจากหน้าเว็บไม่ได้",
        message: "คุณยังเลือกรูปจากคลังรูปหรือไฟล์ในอุปกรณ์ได้ตามปกติ",
        preservation: "Draft ที่มีอยู่ยังคงเดิม",
      });
      return;
    }

    setError(null);
    setCameraState("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraState("ready");
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (cameraError) {
      stopCamera();
      const denied = cameraError instanceof DOMException
        && (cameraError.name === "NotAllowedError" || cameraError.name === "SecurityError");
      setError({
        title: denied ? "ยังไม่ได้รับอนุญาตให้ใช้กล้อง" : "เปิดกล้องไม่สำเร็จ",
        message: denied
          ? "อนุญาตสิทธิ์กล้องในการตั้งค่าเบราว์เซอร์แล้วลองอีกครั้ง หรือเลือกไฟล์แทน"
          : "ลองเปิดกล้องอีกครั้ง หรือเลือกภาพจากอุปกรณ์แทนได้ทันที",
        preservation: "ข้อมูลใน Draft ยังอยู่และยังไม่ได้อัปโหลดออกจากเบราว์เซอร์",
      });
    }
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError({
        title: "กล้องยังไม่พร้อมถ่าย",
        message: "รอให้ภาพจากกล้องแสดงก่อน แล้วกดถ่ายอีกครั้ง",
        preservation: "Draft เดิมยังอยู่ครบ",
      });
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) {
      setError({
        title: "สร้างรูปจากกล้องไม่สำเร็จ",
        message: "ลองถ่ายใหม่ หรือเลือกภาพจากอุปกรณ์แทน",
        preservation: "Draft เดิมยังอยู่ครบ",
      });
      return;
    }

    stopCamera();
    await processPhoto(new File([blob], "camera-photo.jpg", { type: blob.type }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isContinuing || isProcessing) return;
    if (!validateName()) {
      guideTo(nameRef);
      return;
    }
    if (!draft.photo || !photoReady) {
      setError({
        title: "เลือกรูปของน้องก่อนดู Passport",
        message: "เลือกรูปแล้วจัดตำแหน่งให้พอดีก่อนเปิดหน้า Passport",
        preservation: "ชื่อและชนิดสัตว์ที่กรอกไว้ยังอยู่ครบ",
      });
      guideTo(photoPickerRef);
      return;
    }

    updateDetails({ petName: draft.petName.trim() });
    setIsContinuing(true);
    router.push("/create-passport/preview");
  }

  return (
    <form className="photo-step photo-step--combined page-reveal page-reveal--late" onSubmit={handleSubmit} noValidate>
      <div ref={photoPickerRef} className="photo-picker" tabIndex={-1}>
        <input
          ref={inputRef}
          id={inputId}
          className="passport-photo-input"
          type="file"
          accept={acceptedFileTypes.join(",")}
          aria-label="เลือกรูปสำหรับ Pet Passport"
          aria-describedby={`${helpId}${error ? ` ${errorId}` : ""}`}
          aria-invalid={Boolean(error)}
          onChange={(event) => {
            closePhotoActions();
            void processPhoto(event.currentTarget.files?.[0]);
            event.currentTarget.value = "";
          }}
        />

        {cropSource ? (
          <section className="crop-panel" aria-labelledby="crop-title">
            <div>
              <p className="consumer-kicker">จัดภาพ</p>
              <h2 id="crop-title">จัดภาพให้พอดี</h2>
              <p>ลากภาพให้ได้จังหวะที่ชอบ แล้วกดใช้รูปนี้</p>
            </div>
            <button
              type="button"
              className="crop-viewport"
              aria-label="พื้นที่จัดภาพ ลากเพื่อเลื่อน ใช้สองนิ้วหรือล้อเมาส์เพื่อซูม ใช้ลูกศรเพื่อขยับ ปุ่มบวกหรือลบเพื่อซูม และกด Home เพื่อเริ่มใหม่"
              onPointerDown={handleCropPointerDown}
              onPointerMove={handleCropPointerMove}
              onPointerUp={endCropPointer}
              onPointerCancel={endCropPointer}
              onDoubleClick={resetCrop}
              onKeyDown={handleCropKeyDown}
              onWheel={(event) => {
                event.preventDefault();
                setCropZoom((value) => Math.max(1, Math.min(2.5, value + (event.deltaY > 0 ? -0.05 : 0.05))));
              }}
            >
              <Image
                src={cropSource.dataUrl}
                alt="ตัวอย่างรูปสำหรับจัดตำแหน่ง"
                width={cropSource.width}
                height={cropSource.height}
                unoptimized
                style={{
                  position: "absolute",
                  top: `calc(50% + ${cropPreviewOffsetY}%)`,
                  left: `calc(50% + ${cropPreviewOffsetX}%)`,
                  width: `${cropPreviewWidth * 100}%`,
                  height: `${cropPreviewHeight * 100}%`,
                  maxWidth: "none",
                  transform: "translate(-50%, -50%)",
                }}
                draggable={false}
              />
              <span aria-hidden="true" />
            </button>
            <div className="crop-controls">
              <label>ซูม<input aria-label="ซูมภาพ" type="range" min="1" max="2.5" step="0.05" value={cropZoom} onChange={(event) => setCropZoom(Number(event.currentTarget.value))} /></label>
              <small>ลากหรือปัดเพื่อเลื่อน · หนีบสองนิ้วหรือล้อเมาส์เพื่อซูม · คีย์บอร์ดใช้ลูกศร และ +/−</small>
              <button className="button button--ghost crop-reset" type="button" onClick={resetCrop}><ArrowClockwise size={17} weight="bold" /> เริ่มใหม่</button>
            </div>
            <div className="crop-actions">
              <button className="button button--ghost" type="button" onClick={() => setCropSource(null)}><X size={18} weight="bold" /> ยกเลิก</button>
              <button className="button button--primary" type="button" onClick={() => void applyCrop()} disabled={isProcessing}><Save size={18} weight="bold" /> ใช้รูปนี้</button>
            </div>
          </section>
        ) : cameraState !== "closed" ? (
          <section className="camera-panel" aria-label="ถ่ายรูปด้วยกล้อง">
            <div className="camera-panel__view">
              <video ref={videoRef} autoPlay playsInline muted />
              {cameraState === "requesting" ? (
                <span role="status" aria-live="polite">กำลังขอสิทธิ์กล้อง</span>
              ) : null}
            </div>
            <div className="camera-panel__actions">
              <button className="button button--primary" type="button" disabled={cameraState !== "ready"} onClick={() => void capturePhoto()}>
                <Camera size={18} weight="bold" /> ถ่ายภาพนี้
              </button>
              <button className="button button--ghost" type="button" onClick={stopCamera}>
                <X size={18} weight="bold" /> ยกเลิกกล้อง
              </button>
            </div>
          </section>
        ) : !draft.photo ? (
          <div className={error ? "photo-dropzone has-error" : "photo-dropzone"}>
            <span className="photo-dropzone__frame" aria-hidden="true"><ImagePlus size={35} weight="bold" /></span>
            <strong>{isProcessing ? "กำลังเตรียมตัวอย่างรูป" : "เพิ่มรูปหลักของน้อง"}</strong>
            <span>เลือกรูปจากอุปกรณ์ หรือเปิดกล้องเมื่อเบราว์เซอร์รองรับ</span>
            <div className="photo-dropzone__actions">
              <label className="button button--primary" htmlFor={inputId}>
                <ImagePlus size={18} weight="bold" /> เลือกรูป
              </label>
              <button className="button button--paper" type="button" onClick={() => void openCamera()}>
                <Video size={18} weight="bold" /> ถ่ายรูป
              </button>
            </div>
          </div>
        ) : (
          <div className="photo-preview-card">
            <figure className="photo-preview" aria-busy={!photoReady}>
              <Image
                src={draft.photo.dataUrl}
                alt="ตัวอย่างรูปสัตว์ที่เลือกสำหรับ Pet Passport"
                fill
                unoptimized
                sizes="(max-width: 767px) calc(100vw - 64px), 480px"
                onLoad={() => setLoadedPhotoSrc(draft.photo?.dataUrl ?? null)}
                onError={handleImageError}
              />
            </figure>
            <div ref={photoActionsRef} className="photo-actions-menu">
              <button
                ref={photoActionsTriggerRef}
                className="button button--paper photo-actions-menu__trigger"
                type="button"
                aria-haspopup="menu"
                aria-expanded={photoActionsOpen}
                onClick={() => setPhotoActionsOpen((current) => !current)}
              ><Swatches size={18} weight="bold" /> จัดการรูป <ChevronDown size={16} weight="bold" /></button>
              {photoActionsOpen ? <>
                <button className="photo-actions-menu__backdrop" type="button" aria-label="ปิดเมนูจัดการรูป" onClick={closePhotoActions} />
                <div className="photo-actions-menu__panel" role="menu" aria-label="จัดการรูป">
                  <div className="photo-actions-menu__sheet-header">
                    <strong>จัดการรูป</strong>
                    <button type="button" aria-label="ปิดเมนูจัดการรูป" onClick={closePhotoActions}><X size={20} weight="bold" /></button>
                  </div>
                <button
                  className="button button--ghost"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    const originalDataUrl = draft.photo?.originalDataUrl ?? draft.photo?.dataUrl;
                    if (!originalDataUrl || !draft.photo) return;
                    void openCropEditor(originalDataUrl, draft.photo.fileName, originalDataUrl);
                    closePhotoActions();
                  }}
                ><Swatches size={17} weight="bold" /> ปรับภาพ</button>
                <button className="button button--ghost" type="button" role="menuitem" onClick={() => { closePhotoActions(); inputRef.current?.click(); }}><ArrowClockwise size={17} weight="bold" /> เปลี่ยนรูป</button>
                <button className="button button--ghost" type="button" role="menuitem" onClick={() => { closePhotoActions(); void openCamera(); }}><Camera size={17} weight="bold" /> ถ่ายรูปใหม่</button>
                <button className="button button--ghost photo-remove" type="button" role="menuitem" onClick={() => { closePhotoActions(); removePhoto(); }}><Trash size={17} weight="bold" /> ลบรูป</button>
                </div>
              </> : null}
            </div>
          </div>
        )}

        <p id={helpId} className="photo-help">
          JPG, PNG หรือ WebP · สูงสุด 10 MB
        </p>
        <div id={errorId} className="photo-error" role="alert" aria-live="assertive">
          {error ? (
            <>
              <Info size={20} weight="fill" />
              <div>
                <strong>{error.title}</strong>
                <p>{error.message}</p>
                <small>{error.preservation}</small>
                <button className="text-button" type="button" onClick={() => inputRef.current?.click()}>
                  เลือกรูปอื่นแล้วลองอีกครั้ง
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="photo-step__content">
        <div className="create-detail-fields">
          <div className="field-group">
            <label htmlFor={nameId}>น้องชื่ออะไร ?</label>
            <input
              ref={nameRef}
              id={nameId}
              name="pet-name"
              type="text"
              autoComplete="off"
              placeholder="เช่น โมจิ"
              value={draft.petName}
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? nameErrorId : undefined}
              onBlur={validateName}
              onChange={(event) => {
                updateDetails({ petName: event.currentTarget.value });
                if (nameError && event.currentTarget.value.trim()) setNameError(null);
              }}
            />
            {nameError ? (
              <p id={nameErrorId} className="field-error" role="alert">
                <Info size={18} weight="fill" /> {nameError}
              </p>
            ) : null}
          </div>

          <fieldset className="species-fieldset">
            <legend>ชนิดสัตว์</legend>
            <div className="species-options">
              <label className={draft.species === "cat" ? "species-option is-selected" : "species-option"}>
                <input type="radio" name="species" value="cat" checked={draft.species === "cat"} onChange={() => selectSpecies("cat")} />
                <span className="species-option__icon"><Cat size={28} weight="bold" /></span>
                <span><strong>แมว</strong><small>Cat</small></span>
                {draft.species === "cat" ? <CheckCircle size={20} weight="fill" /> : null}
              </label>
              <label className={draft.species === "dog" ? "species-option is-selected" : "species-option"}>
                <input type="radio" name="species" value="dog" checked={draft.species === "dog"} onChange={() => selectSpecies("dog")} />
                <span className="species-option__icon"><Dog size={28} weight="bold" /></span>
                <span><strong>สุนัข</strong><small>Dog</small></span>
                {draft.species === "dog" ? <CheckCircle size={20} weight="fill" /> : null}
              </label>
            </div>
          </fieldset>
        </div>

        <div className="photo-step__actions">
          <p>ข้อมูลอื่น ๆ เติมเพิ่มทีหลังได้เสมอ</p>
          <button
            className="button button--primary button--large"
            type="submit"
            disabled={!hydrated || isContinuing || isProcessing}
            aria-busy={isContinuing || isProcessing}
          >
            {isContinuing ? "กำลังเปิด Passport" : "ดู Passport"}
            <ChevronRight size={18} weight="bold" />
          </button>
        </div>
      </div>
    </form>
  );
}
