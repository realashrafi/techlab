import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { BrowserMultiFormatReader, Result } from '@zxing/library/esm/browser/BrowserMultiFormatReader';
import { motion, AnimatePresence } from 'framer-motion';

// تعریف تایپ‌ها
interface BarcodeData {
  barcode: string;
  name: string;
  description: string;
  price: number;
  des: string;
}

interface Snapshot {
  id: number;
  image: string;
  barcode: string;
}

interface ScanLog {
  barcode: string;
  status: 'موجود' | 'ناموجود';
  timestamp: string;
}

interface BarcodePosition {
  barcode: string;
  topLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
  data: BarcodeData | null;
}

const BarcodeScanner: React.FC = () => {
  const [barcodeData, setBarcodeData] = useState<BarcodeData | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [barcodePositions, setBarcodePositions] = useState<BarcodePosition[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scannedCodes = useRef<Set<string>>(new Set());
  const isMounted = useRef<boolean>(true);
  const isDecoding = useRef<boolean>(false);

  // دیتابیس فیک با فیلد des
  const fakeBarcodeData: BarcodeData[] = [
    { barcode: '123456789', name: 'محصول A', description: 'این یک محصول تستی است.', price: 100, des: 'شیراز' },
    { barcode: '987654321', name: 'محصول B', description: 'محصول تستی دیگر.', price: 150, des: 'تهران' },
    { barcode: '456789123', name: 'محصول C', description: 'محصول با ویژگی خاص.', price: 200, des: 'اصفهان' },
  ];

  // تابع برای ترسیم باکس و اطلاعات روی Canvas
  const drawBarcodeOverlay = (positions: BarcodePosition[]) => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // تنظیم اندازه Canvas مطابق با ویدئو
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    positions.forEach((pos) => {
      // ترسیم مستطیل دور بارکد
      ctx.strokeStyle = 'lime';
      ctx.lineWidth = 4;
      ctx.strokeRect(
          pos.topLeft.x,
          pos.topLeft.y,
          pos.bottomRight.x - pos.topLeft.x,
          pos.bottomRight.y - pos.topLeft.y
      );

      // نمایش اطلاعات بارکد
      if (pos.data) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(pos.topLeft.x, pos.topLeft.y - 60, 200, 60);
        ctx.fillStyle = 'white';
        ctx.font = '14px sans-serif';
        ctx.fillText(`نام: ${pos.data.name}`, pos.topLeft.x + 5, pos.topLeft.y - 45);
        ctx.fillText(`قیمت: ${pos.data.price} تومان`, pos.topLeft.x + 5, pos.topLeft.y - 30);
        ctx.fillText(`مقصد: ${pos.data.des}`, pos.topLeft.x + 5, pos.topLeft.y - 15);
      }
    });
  };

  useEffect(() => {
    readerRef.current = new BrowserMultiFormatReader();
    isMounted.current = true;

    navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          if (!isMounted.current) return;
          if (!videoRef.current) {
            setError('المنت ویدئو یافت نشد.');
            return;
          }
          videoRef.current.srcObject = stream;
          videoRef.current.onplay = () => console.log('ویدئو در حال پخش است');
          videoRef.current.onpause = () => console.log('ویدئو متوقف شد');
          videoRef.current.onerror = (e) => console.error('خطای ویدئو:', e);
          videoRef.current.onloadedmetadata = () => {
            console.log('ویدئو آماده شد');
            if (readerRef.current && isMounted.current && !isDecoding.current) {
              isDecoding.current = true;
              readerRef.current.decodeFromVideoDevice(
                  // @ts-ignore
                  undefined,
                  videoRef.current!,
                  (result: Result, err) => {
                    if (!isMounted.current) {
                      isDecoding.current = false;
                      return;
                    }
                    if (result) {
                      const code = result.getText();
                      if (scannedCodes.current.has(code)) {
                        console.log('بارکد تکراری شناسایی شد:', code);
                        return;
                      }
                      scannedCodes.current.add(code);
                      console.log('بارکد شناسایی شد:', code);

                      const timestamp = new Date().toLocaleString('fa-IR');
                      const foundData = fakeBarcodeData.find((item) => item.barcode === code);
                      setScanLogs((prev) => [
                        { barcode: code, status: foundData ? 'موجود' : 'ناموجود', timestamp },
                        ...prev.slice(0, 9),
                      ]);

                      if (foundData) {
                        setBarcodeData(foundData);
                        // دریافت موقعیت بارکد
                        const resultPoints = result.getResultPoints();
                        const topLeft = resultPoints[0];
                        const bottomRight = resultPoints[2] || resultPoints[1]; // برای بارکدهای خطی
                        const position: BarcodePosition = {
                          barcode: code,
                          topLeft: { x: topLeft.getX(), y: topLeft.getY() },
                          bottomRight: { x: bottomRight.getX(), y: bottomRight.getY() },
                          data: foundData,
                        };
                        setBarcodePositions((prev) => {
                          const newPositions = prev.filter((pos) => pos.barcode !== code);
                          return [...newPositions, position];
                        });

                        if (videoRef.current && videoRef.current.readyState >= 2) {
                          const canvas = document.createElement('canvas');
                          canvas.width = videoRef.current.videoWidth;
                          canvas.height = videoRef.current.videoHeight;
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                            const newSnapshot = canvas.toDataURL('image/png');
                            setSnapshots((prev) => {
                              if (prev.some((snap) => snap.barcode === code)) {
                                console.log('اسنپ‌شات تکراری شناسایی شد:', code);
                                return prev;
                              }
                              return [
                                { id: Date.now(), image: newSnapshot, barcode: code },
                                ...prev,
                              ];
                            });
                            setError(null);
                          }
                        }
                      } else {
                        setError('بارکد شناسایی شده در دیتابیس وجود ندارد.');
                      }

                      setTimeout(() => {
                        scannedCodes.current.delete(code);
                        setBarcodePositions((prev) => prev.filter((pos) => pos.barcode !== code));
                        console.log('بارکد از لیست اسکن‌شده‌ها حذف شد:', code);
                      }, 1000);
                    }
                    if (err && err.name !== 'NotFoundException') {
                      setError('خطا در اسکن بارکد: ' + err.message);
                    }
                    isDecoding.current = false;
                  }
              );
            }
          };
        })
        .catch((err) => {
          if (!isMounted.current) return;
          setError(`خطا در دسترسی به دوربین: ${err.message}. لطفاً دسترسی به دوربین را در تنظیمات مرورگر مجاز کنید.`);
          console.error('خطا در دسترسی به دوربین:', err);
        });

    return () => {
      isMounted.current = false;
      if (readerRef.current) {
        readerRef.current.reset();
        readerRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
        videoRef.current.pause();
      }
    };
  }, []);

  // به‌روزرسانی Canvas برای ترسیم باکس‌ها
  useEffect(() => {
    drawBarcodeOverlay(barcodePositions);
  }, [barcodePositions]);

  // مدیریت کلیک روی اسنپ‌شات
  const handleSnapshotClick = (snap: Snapshot) => {
    setSelectedSnapshot(snap);
  };

  // بستن مدال با کلیک روی پس‌زمینه
  const handleCloseModal = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setSelectedSnapshot(null);
    }
  };

  return (
      <div className="min-h-screen bg-[url('https://wonderful-yonath-zqfmh2rkb.storage.iran.liara.space/local-share/181256-light-graphic_design-design-damonxart-linkedin-1366x768.jpg')] bg-cover  p-4 font-sans">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6 text-center">
          اسکنر بارکد
        </h2>

        {/* گریدبندی سه‌گانه */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto">
          {/* بخش ویدئو */}
          <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="col-span-1 md:col-span-1  rounded-lg  overflow-hidden relative"
          >
            <video
                ref={videoRef}
                className="w-full h-fit"
                autoPlay
                muted
                playsInline
            />
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full"
                style={{ pointerEvents: 'none' }}
            />
            <AnimatePresence>
              {error && (
                  <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 text-sm"
                  >
                    {error}
                  </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* بخش اطلاعات و گالری */}
          <div className="col-span-1 md:col-span-1 space-y-4">
            {/* اطلاعات بارکد */}
            <AnimatePresence>
              {barcodeData ? (
                  <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className=" bg-gray-800/80 backdrop-blur-xs p-4 rounded-lg shadow-md"
                  >
                    <h3 className="text-lg font-semibold text-gray-200 mb-2">
                      اطلاعات بارکد
                    </h3>
                    <ul className="space-y-2 text-gray-300 text-sm">
                      <li><span className="font-semibold">نام:</span> {barcodeData.name}</li>
                      <li><span className="font-semibold">توضیحات:</span> {barcodeData.description}</li>
                      <li><span className="font-semibold">قیمت:</span> {barcodeData.price} تومان</li>
                      <li><span className="font-semibold">مقصد:</span> {barcodeData.des}</li>
                    </ul>
                  </motion.div>
              ) : (
                  <p className="text-center text-gray-400 text-sm">
                    لطفاً یک بارکد را اسکن کنید.
                  </p>
              )}
            </AnimatePresence>

            {/* گالری اسنپ‌شات‌ها */}
            {snapshots.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800/80 backdrop-blur-xs p-4 rounded-lg shadow-md"
                >
                  <h3 className="text-lg font-semibold text-gray-200 mb-4">
                    گالری اسنپ‌شات‌ها
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {snapshots.map((snap) => (
                        <motion.div
                            key={snap.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.05 }}
                            className="relative rounded-lg overflow-hidden shadow-md cursor-pointer"
                            onClick={() => handleSnapshotClick(snap)}
                        >
                          <img
                              src={snap.image}
                              alt={`Snapshot ${snap.barcode}`}
                              className="w-full h-24 object-cover"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center">
                            {snap.barcode}
                          </div>
                        </motion.div>
                    ))}
                  </div>
                </motion.div>
            )}
          </div>

          {/* بخش لاگ‌ها */}
          <div className="col-span-1 md:col-span-1">
            {scanLogs.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800/80 backdrop-blur-xs p-4 rounded-lg shadow-md h-full"
                >
                  <h3 className="text-lg font-semibold text-gray-200 mb-4">
                    تاریخچه اسکن‌ها
                  </h3>
                  <ul className="space-y-2 text-gray-300 max-h-96 overflow-y-auto text-sm">
                    {scanLogs.map((log, index) => (
                        <li key={index}>
                          <span className="font-semibold">کد:</span> {log.barcode} |{' '}
                          <span>{log.status}</span> |{' '}
                          <span>{log.timestamp}</span>
                        </li>
                    ))}
                  </ul>
                </motion.div>
            )}
          </div>
        </div>

        {/* مدال برای نمایش جزئیات اسنپ‌شات */}
        <AnimatePresence>
          {selectedSnapshot && (
              <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-gray-800/80 backdrop-blur-xs bg-opacity-50 flex items-center justify-center z-50"
                  onClick={handleCloseModal}
              >
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="bg-gray-800/60 backdrop-blur-xs p-6 rounded-lg shadow-xl max-w-md w-full mx-4"
                >
                  <h3 className="text-lg font-semibold text-gray-200 mb-4">
                    جزئیات اسنپ‌شات
                  </h3>
                  <img
                      src={selectedSnapshot.image}
                      alt={`Snapshot ${selectedSnapshot.barcode}`}
                      className="w-full h-fit object-cover rounded-lg mb-4"
                  />
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li><span className="font-semibold">کد بارکد:</span> {selectedSnapshot.barcode}</li>
                    {fakeBarcodeData.find((item) => item.barcode === selectedSnapshot.barcode) && (
                        <>
                          <li>
                            <span className="font-semibold">نام:</span>{' '}
                            {fakeBarcodeData.find((item) => item.barcode === selectedSnapshot.barcode)!.name}
                          </li>
                          <li>
                            <span className="font-semibold">توضیحات:</span>{' '}
                            {fakeBarcodeData.find((item) => item.barcode === selectedSnapshot.barcode)!.description}
                          </li>
                          <li>
                            <span className="font-semibold">قیمت:</span>{' '}
                            {fakeBarcodeData.find((item) => item.barcode === selectedSnapshot.barcode)!.price}{' '}
                            تومان
                          </li>
                          <li>
                            <span className="font-semibold">مقصد:</span>{' '}
                            {fakeBarcodeData.find((item) => item.barcode === selectedSnapshot.barcode)!.des}
                          </li>
                        </>
                    )}
                  </ul>
                  <button
                      onClick={() => setSelectedSnapshot(null)}
                      className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 w-full"
                  >
                    بستن
                  </button>
                </motion.div>
              </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
};

export default BarcodeScanner;