"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DemoBusinessContext, QrContractType } from "../../_prototype/businessState";
import {
  DEMO_BUSINESS_CONTEXTS,
  createOrResumeBusinessIntake,
  detectQrContract,
  ensureBusinessScanFixtures,
  findTemporaryAccessFromScanValue,
  getDemoBusinessContextDetails,
  readActiveBusinessContext,
} from "../../_prototype/businessState";
import { evaluateTemporaryAccess } from "../../_prototype/sharingState";
import {
  Camera,
  CheckCircle,
  CircleAlert,
  Clock,
  Info,
  LockKey,
  QrCode,
  Scan,
  ShieldCheck,
  Video,
  WifiOff,
} from "../../_components/icons";

type ScannerState =
  | "ready"
  | "camera-permission"
  | "scanning"
  | "manual-code"
  | "validating"
  | "invalid"
  | "expired"
  | "revoked"
  | "wrong-business"
  | "wrong-qr-type"
  | "suspicious"
  | "network-error"
  | "camera-denied"
  | "camera-unavailable"
  | "no-camera"
  | "unreadable"
  | "access-changed"
  | "valid";

type DetectedBarcode = { rawValue?: string };
type BarcodeDetectorInstance = { detect(source: CanvasImageSource): Promise<DetectedBarcode[]> };
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

const SCANNER_COPY: Record<Exclude<ScannerState, "ready" | "camera-permission" | "scanning" | "manual-code" | "validating" | "valid">, { title: string; message: string; recovery: string }> = {
  invalid: { title: "QR นี้ใช้ไม่ได้", message: "ไม่พบสิทธิ์ที่ใช้งานได้ และยังไม่มีข้อมูลของน้องถูกเปิด", recovery: "ตรวจรหัสใต้ QR หรือขอ QR ใหม่จากเจ้าของ" },
  expired: { title: "สิทธิ์เข้าถึงหมดอายุแล้ว", message: "QR นี้ใช้ต่อไม่ได้ และเราไม่แสดงข้อมูลของน้องจากสิทธิ์เดิม", recovery: "ขอให้เจ้าของสร้าง QR ชั่วคราวสำหรับร้านใหม่" },
  revoked: { title: "เจ้าของยกเลิกสิทธิ์แล้ว", message: "ขั้นตอนรับเข้าถูกหยุด และข้อมูลของน้องจากสิทธิ์เดิมจะไม่ถูกแสดง", recovery: "ขอ QR ใหม่จากเจ้าของก่อนรับเข้า" },
  "wrong-business": { title: "ร้านหรือสาขาไม่ตรงกับ QR", message: "QR นี้ไม่ได้ออกให้ร้านและสาขาปัจจุบัน จึงยังไม่เปิดข้อมูลของน้อง", recovery: "เลือกร้านและสาขาที่ถูกต้อง หรือขอ QR ใหม่" },
  "wrong-qr-type": { title: "QR นี้ไม่ได้ใช้สำหรับรับเข้าร้าน", message: "QR Passport แบบเร็วและ QR ความปลอดภัยสาธารณะใช้รับเข้าร้านไม่ได้", recovery: "สแกน QR ชั่วคราวสำหรับร้าน" },
  suspicious: { title: "หยุดตรวจ QR นี้ชั่วคราว", message: "QR นี้มีรูปแบบผิดปกติ เราจึงยังไม่เปิดข้อมูลของน้อง", recovery: "ขอให้เจ้าของตรวจและสร้าง QR ใหม่" },
  "network-error": { title: "ตรวจสิทธิ์ไม่สำเร็จ", message: "ระหว่างมีปัญหาการเชื่อมต่อ เราจะไม่ดึงข้อมูลเก่าของน้องมาแสดง", recovery: "ลองตรวจอีกครั้งเมื่อเชื่อมต่อได้" },
  "camera-denied": { title: "ยังไม่ได้รับอนุญาตให้ใช้กล้อง", message: "เบราว์เซอร์ไม่ได้ให้สิทธิ์กล้อง แต่ยังกรอกรหัสใต้ QR ได้", recovery: "อนุญาตกล้องในการตั้งค่าเบราว์เซอร์แล้วลองใหม่ หรือกรอกรหัสแทน" },
  "camera-unavailable": { title: "เปิดกล้องไม่สำเร็จ", message: "กล้องอาจกำลังถูกใช้งานหรือเบราว์เซอร์เปิดภาพไม่ได้", recovery: "ปิดแอปที่ใช้กล้อง ลองใหม่ หรือกรอกรหัสแทน" },
  "no-camera": { title: "อุปกรณ์นี้ไม่มีกล้องที่ใช้ได้", message: "ไม่พบกล้องสำหรับสแกน QR", recovery: "ใช้รหัสที่แสดงใต้ QR ชั่วคราวสำหรับร้าน" },
  unreadable: { title: "อ่าน QR ไม่สำเร็จ", message: "ภาพอาจไม่ชัดหรือ QR อยู่นอกกรอบ และยังไม่มีข้อมูลของน้องถูกเปิด", recovery: "จัด QR ให้อยู่กลางกรอบแล้วลองใหม่ หรือกรอกรหัสแทน" },
  "access-changed": { title: "สิทธิ์เปลี่ยนระหว่างตรวจ", message: "ระบบหยุดขั้นตอนเพื่อไม่ใช้สิทธิ์ที่ล้าสมัย", recovery: "สแกน QR ชั่วคราวสำหรับร้านอีกครั้ง" },
};

export function BusinessScanner() {
  const [scannerState, setScannerState] = useState<ScannerState>("ready");
  const [context, setContext] = useState<DemoBusinessContext>(DEMO_BUSINESS_CONTEXTS[0]);
  const [manualCode, setManualCode] = useState("");
  const [manualError, setManualError] = useState("");
  const [detectedType, setDetectedType] = useState<QrContractType | null>(null);
  const [validAccessId, setValidAccessId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);
  const contextKeyRef = useRef(DEMO_BUSINESS_CONTEXTS[0].key);

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current !== null) window.clearInterval(scanTimerRef.current);
    scanTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const validateValue = useCallback((value: string, source: "camera" | "manual" | "fixture") => {
    stopCamera();
    setScannerState("validating");
    setManualError("");
    setValidAccessId(null);
    const type = detectQrContract(value);
    setDetectedType(type);

    window.setTimeout(() => {
      if (type === "quick-passport" || type === "public-safety") {
        setScannerState("wrong-qr-type");
        setAnnouncement("ปฏิเสธ QR ที่ไม่ได้ออกสำหรับรับเข้าร้านแล้ว");
        return;
      }
      if (type !== "temporary-business") {
        setScannerState("invalid");
        setAnnouncement("ไม่พบ QR ชั่วคราวสำหรับร้านที่ใช้ได้");
        return;
      }
      const access = findTemporaryAccessFromScanValue(value);
      const gate = evaluateTemporaryAccess(access, context.businessId, context.branchId);
      if (gate !== "valid" || !access) {
        setScannerState(gate === "network-error" ? "network-error" : gate);
        setAnnouncement("ตรวจสิทธิ์แล้ว แต่ยังเริ่มรับเข้าไม่ได้");
        return;
      }
      setValidAccessId(access.id);
      setScannerState("valid");
      setAnnouncement(`ตรวจ QR ชั่วคราวสำหรับร้านจาก ${source === "camera" ? "กล้อง" : source === "manual" ? "รหัสใต้ QR" : "ตัวควบคุมทดสอบ"} สำเร็จ`);
    }, 320);
  }, [context.branchId, context.businessId, stopCamera]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      ensureBusinessScanFixtures();
      const activeContext = readActiveBusinessContext();
      contextKeyRef.current = activeContext.key;
      setContext(activeContext);
      const fixture = new URLSearchParams(window.location.search).get("fixture");
      if (!fixture) return;
      const fixtureStates: Partial<Record<string, ScannerState>> = {
        network: "network-error",
        suspicious: "suspicious",
        unreadable: "unreadable",
        denied: "camera-denied",
        unavailable: "camera-unavailable",
        "no-camera": "no-camera",
        changed: "access-changed",
      };
      const directState = fixtureStates[fixture];
      if (directState) {
        setScannerState(directState);
        return;
      }
      const fixtureValues: Record<string, string> = {
        active: "DEMO-TEMP-ACTIVE",
        pending: "DEMO-TEMP-PENDING",
        expired: "DEMO-TEMP-EXPIRED",
        revoked: "DEMO-TEMP-REVOKED",
        wrong: "DEMO-TEMP-WRONG",
        quick: "QUICK-PASSPORT-DEMO",
        safety: "PUBLIC-SAFETY-DEMO",
        invalid: "DEMO-TEMP-UNKNOWN",
      };
      const value = fixtureValues[fixture];
      if (value) validateValue(value, "fixture");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [validateValue]);

  useEffect(() => {
    const syncContext = () => {
      const next = readActiveBusinessContext();
      if (next.key === contextKeyRef.current) return;
      contextKeyRef.current = next.key;
      stopCamera();
      setContext(next);
      setScannerState("ready");
      setManualError("");
      setDetectedType(null);
      setValidAccessId(null);
      setAnnouncement("เปลี่ยนร้านหรือสาขาตัวอย่างแล้ว");
    };
    window.addEventListener("meawketting:business-state", syncContext);
    return () => window.removeEventListener("meawketting:business-state", syncContext);
  }, [stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (scannerState === "manual-code") {
      window.requestAnimationFrame(() => manualInputRef.current?.focus());
      return;
    }
    if (SCANNER_COPY[scannerState as keyof typeof SCANNER_COPY] || scannerState === "valid") {
      window.requestAnimationFrame(() => resultHeadingRef.current?.focus());
    }
  }, [scannerState]);

  async function startCamera() {
    setScannerState("camera-permission");
    setAnnouncement("กำลังขอสิทธิ์กล้อง");
    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerState("camera-unavailable");
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices?.();
      if (devices && devices.length > 0 && !devices.some((device) => device.kind === "videoinput")) {
        setScannerState("no-camera");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      setScannerState("scanning");
      setAnnouncement("กล้องพร้อมสแกน QR ชั่วคราวสำหรับร้าน");
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const Detector = (window as typeof window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      if (!Detector) return;
      const detector = new Detector({ formats: ["qr_code"] });
      scanTimerRef.current = window.setInterval(async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return;
        try {
          const result = await detector.detect(video);
          const value = result[0]?.rawValue;
          if (value) validateValue(value, "camera");
        } catch {
          setAnnouncement("กล้องยังอ่าน QR ไม่ได้ จัด QR ให้อยู่ในกรอบหรือใช้รหัสใต้ QR");
        }
      }, 700);
    } catch (error) {
      stopCamera();
      const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
      setScannerState(denied ? "camera-denied" : error instanceof DOMException && error.name === "NotFoundError" ? "no-camera" : "camera-unavailable");
    }
  }

  function submitManualCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!manualCode.trim()) {
      setManualError("กรอกรหัสใต้ QR หรือ URL จาก QR ชั่วคราวสำหรับร้าน");
      manualInputRef.current?.focus();
      return;
    }
    validateValue(manualCode, "manual");
  }

  function resetScanner(next: ScannerState = "ready") {
    stopCamera();
    setScannerState(next);
    setManualError("");
    setDetectedType(null);
    setValidAccessId(null);
    setAnnouncement("");
  }

  function enterIntake() {
    if (!validAccessId) return;
    const access = findTemporaryAccessFromScanValue(`/temporary-access/${validAccessId}`);
    const gate = evaluateTemporaryAccess(access, context.businessId, context.branchId);
    if (!access || gate !== "valid") {
      setValidAccessId(null);
      setScannerState(gate === "expired" || gate === "revoked" || gate === "wrong-business" ? gate : "access-changed");
      return;
    }
    const intake = createOrResumeBusinessIntake(access, context);
    if (!intake) {
      setScannerState("network-error");
      return;
    }
    window.location.assign(`/business/intake/${encodeURIComponent(intake.id)}`);
  }

  const details = getDemoBusinessContextDetails(context);
  const errorCopy = SCANNER_COPY[scannerState as keyof typeof SCANNER_COPY];

  return (
    <div className="business-shell shell">
      <header className="business-task-heading">
        <p className="business-kicker"><Scan size={16} weight="bold" /> สแกนรับเข้า</p>
        <h1>สแกน QR เพื่อรับน้องเข้าร้าน</h1>
        <p>ใช้เฉพาะ QR ชั่วคราวสำหรับร้านที่ออกให้ {details.business?.name} · {details.branch?.name}</p>
      </header>
      <p className="sr-live" role="status" aria-live="polite">{announcement}</p>

      {scannerState === "ready" ? (
        <section className="scanner-workspace business-state-enter" aria-labelledby="scanner-ready-heading">
          <div className="scanner-camera scanner-camera--idle">
            <span className="scanner-frame" aria-hidden="true"><Scan size={64} weight="bold" /></span>
            <div><h2 id="scanner-ready-heading">พร้อมสแกน QR สำหรับรับเข้า</h2><p>วาง QR ให้อยู่ในกรอบ หรือใช้รหัสที่แสดงใต้ QR</p></div>
          </div>
          <div className="scanner-actions">
            <button className="button button--business button--large" type="button" onClick={() => void startCamera()}><Camera size={20} weight="bold" /> เปิดกล้องสแกน</button>
            <button className="button button--ghost button--large" type="button" onClick={() => setScannerState("manual-code")}><QrCode size={20} weight="bold" /> กรอกรหัสใต้ QR</button>
          </div>
          <p className="scanner-implementation-note"><Info size={18} weight="bold" /> ถ้ากล้องอ่าน QR ไม่ได้ คุณยังใช้รหัสใต้ QR เพื่อทำงานต่อได้</p>
        </section>
      ) : null}

      {scannerState === "camera-permission" || scannerState === "scanning" ? (
        <section className="scanner-workspace" aria-labelledby="scanner-camera-heading" aria-busy={scannerState === "camera-permission"}>
          <div className="scanner-camera scanner-camera--live">
            <video ref={videoRef} autoPlay playsInline muted aria-label="ภาพจากกล้องสำหรับจัดตำแหน่ง QR" />
            <span className="scanner-live-frame" aria-hidden="true" />
            <span className="scanner-camera-status"><Video size={18} weight="bold" /> {scannerState === "camera-permission" ? "กำลังขอสิทธิ์กล้อง" : "กำลังมองหา QR"}</span>
          </div>
          <p className="scanner-instruction">จัด QR ให้อยู่กลางกรอบ เมื่ออ่านได้ระบบจะตรวจประเภทและสิทธิ์ก่อนเปิดข้อมูล</p>
          <div className="scanner-actions">
            <button className="button button--ghost" type="button" onClick={() => resetScanner("unreadable")}>QR อ่านไม่ออก</button>
            <button className="button button--ghost" type="button" onClick={() => resetScanner("manual-code")}>ใช้รหัสใต้ QR</button>
          </div>
        </section>
      ) : null}

      {scannerState === "manual-code" ? (
        <section className="scanner-manual" aria-labelledby="manual-heading">
          <span className="scanner-state-icon"><QrCode size={32} weight="bold" /></span>
          <h2 id="manual-heading">กรอกรหัสใต้ QR</h2>
          <p>ใช้รหัสที่แสดงใต้ QR ชั่วคราวสำหรับร้านเท่านั้น</p>
          <form onSubmit={submitManualCode} noValidate>
            <label htmlFor="temporary-code">รหัสใต้ QR สำหรับร้าน</label>
            <input ref={manualInputRef} id="temporary-code" value={manualCode} aria-invalid={Boolean(manualError)} aria-describedby={manualError ? "temporary-code-error" : "temporary-code-help"} autoComplete="off" placeholder="เช่น DEMO-TEMP-ACTIVE" onChange={(event) => { setManualCode(event.target.value); setManualError(""); }} />
            <p id="temporary-code-help">รหัสทดลอง: <code>DEMO-TEMP-ACTIVE</code>, <code>DEMO-TEMP-PENDING</code>, <code>DEMO-TEMP-EXPIRY-MIDFLOW</code></p>
            {manualError ? <p id="temporary-code-error" className="field-error" role="alert"><CircleAlert size={18} weight="bold" /> {manualError}</p> : null}
            <div className="scanner-actions"><button className="button button--business" type="submit"><ShieldCheck size={18} weight="bold" /> ตรวจรหัส</button><button className="button button--ghost" type="button" onClick={() => resetScanner()}>ยกเลิก</button></div>
          </form>
        </section>
      ) : null}

      {scannerState === "validating" ? (
        <section className="scanner-result scanner-result--checking business-state-enter" aria-busy="true" aria-live="polite"><span className="scanner-state-icon"><Clock size={32} weight="bold" /></span><h2>กำลังตรวจสิทธิ์ของ QR</h2><p>ระหว่างตรวจ เรายังไม่แสดงชื่อ รูป หรือข้อมูลอ้างอิงของน้อง</p></section>
      ) : null}

      {errorCopy ? (
        <section className="scanner-result scanner-result--error business-state-enter" role="alert" aria-labelledby="scanner-result-heading">
          <span className="scanner-state-icon">{scannerState === "network-error" ? <WifiOff size={32} weight="bold" /> : <CircleAlert size={32} weight="bold" />}</span>
          <h2 ref={resultHeadingRef} id="scanner-result-heading" tabIndex={-1}>{errorCopy.title}</h2>
          <p>{errorCopy.message}</p>
          <div className="scanner-privacy-lock"><LockKey size={20} weight="bold" /><span><strong>ยังไม่เปิดข้อมูลระบุตัวน้อง</strong><small>ข้อมูลที่ต้องมีสิทธิ์ยังถูกซ่อนไว้</small></span></div>
          <p className="scanner-recovery"><strong>ทำต่อ:</strong> {errorCopy.recovery}</p>
          <div className="scanner-actions">
            <button className="button button--business" type="button" onClick={() => resetScanner()}><Scan size={18} weight="bold" /> สแกนใหม่</button>
            <button className="button button--ghost" type="button" onClick={() => resetScanner("manual-code")}>กรอกรหัสใต้ QR</button>
          </div>
        </section>
      ) : null}

      {scannerState === "valid" ? (
        <section className="scanner-result scanner-result--valid business-state-enter" aria-labelledby="scanner-result-heading">
          <span className="scanner-state-icon"><CheckCircle size={32} weight="bold" /></span>
          <p className="business-kicker">QR ใช้งานได้</p>
          <h2 ref={resultHeadingRef} id="scanner-result-heading" tabIndex={-1}>QR ตรงกับร้านและสาขานี้</h2>
          <p>ประเภท QR ถูกต้องและตรงกับ {details.business?.name} · {details.branch?.name}</p>
          <div className="scanner-safe-result"><ShieldCheck size={22} weight="bold" /><span><strong>พร้อมตรวจข้อมูลก่อนรับน้อง</strong><small>หน้าถัดไปจะแสดงเฉพาะข้อมูลที่เจ้าของเปิดให้ร้านนี้</small></span></div>
          <div className="scanner-actions"><button className="button button--business button--large" type="button" onClick={enterIntake}>ตรวจข้อมูลก่อนรับน้อง</button><button className="button button--ghost" type="button" onClick={() => resetScanner()}>สแกนใหม่</button></div>
          <small className="scanner-detected-type">ประเภทที่ตรวจพบ: {detectedType === "temporary-business" ? "QR ชั่วคราวสำหรับร้าน" : detectedType}</small>
        </section>
      ) : null}
    </div>
  );
}
