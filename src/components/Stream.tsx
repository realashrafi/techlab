import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const StreamPage: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [videoData, setVideoData] = useState<string | null>(null);
    const [canvasData, setCanvasData] = useState<string | null>(null);

    useEffect(() => {
        const broadcastChannel = new BroadcastChannel('barcode_stream');
        broadcastChannel.onmessage = (event) => {
            const { type, data } = event.data;
            if (type === 'video') {
                setVideoData(data);
            } else if (type === 'canvas') {
                setCanvasData(data);
            }
        };

        return () => {
            broadcastChannel.close();
        };
    }, []);

    useEffect(() => {
        if (!canvasRef.current || !canvasData) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.src = canvasData;
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
        };
    }, [canvasData]);

    return (
        <div className="min-h-screen bg-gray-900 p-4 font-sans">
            <h2 className="text-2xl font-bold text-gray-200 mb-6 text-center">
                استریم ویدئو و بارکدها
            </h2>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative max-w-4xl mx-auto"
            >
                {videoData && (
                    <img
                        src={videoData}
                        alt="Video Stream"
                        className="w-full h-fit object-cover"
                    />
                )}
                <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full"
                    style={{ pointerEvents: 'none' }}
                />
            </motion.div>
        </div>
    );
};

export default StreamPage;