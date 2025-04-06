import React, { ReactNode, useRef } from "react";


export const useLabelGenerator = () => {
  let device: any = undefined;


  const connectToPrinter = async () => {
    if (device === undefined) {
      try {
        // Request a serial port (this will show a device chooser to the user)
        //@ts-ignore because usb in navigator not fond in ts
        const port = await navigator.serial.requestPort({
          filters: [{ usbVendorId: 11652 }] // Replace with the correct vendorId
        });
        await port.open({ baudRate: 9600 }); // Adjust baudRate if needed
        device = port;
        return device;
      } catch (error) {
        console.error("Error connecting to the printer:", error);
        window.alert("پیرینتر متصل نمیباشد");
      }
    } else {
      return device;
    }
  };

  async function requestDevice() {
    const device = await connectToPrinter();

    if (device) {
      const canvas = generateLabelCanvas();

      const { hexData } = convertCanvasToHex(canvas);

      const zplCommand = `
^XA
^MNY
^PW800
^LL406
^LT0
^FO50,0^GB0,0,0^FS
^GFA,${hexData.length},${hexData.length},100,${hexData}
^XZ
`;

      const encoder = new TextEncoder();

      const rawData = encoder.encode(zplCommand);
      const buffer = new Uint8Array(rawData).buffer;
      await device.open();
      await device.selectConfiguration(1);
      await device.claimInterface(0);
      await device.transferOut(1, buffer);

      // هنگامی که تمام عملیات‌ها تمام شد
      // await device.close();
    }
  }

  function convertCanvasToHex(canvas: any, threshold = 128) {
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height).data;

    const rowBytes = Math.ceil(width / 8);
    let hexData = "";

    // Process every row
    for (let y = 0; y < height; y++) {
      for (let bx = 0; bx < rowBytes; bx++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = bx * 8 + bit;
          let pixelOn = 0;
          if (x < width) {
            const index = (y * width + x) * 4;
            // Convert pixel to grayscale using average or luma formula.
            // Here, using a simple average.
            const r = imageData[index];
            const g = imageData[index + 1];
            const b = imageData[index + 2];
            // const avg = (r + g + b) / 3;
            const luma = 0.299 * r + 0.587 * g + 0.114 * b;
            // Determine if the pixel is black or white based on threshold.
            // If avg is below the threshold, we assume the pixel is black (dot)
            if (luma < threshold) {
              pixelOn = 1;
            }
          }
          // Most printers consider the MSB as the left-most pixel.
          byte |= pixelOn << (7 - bit);
        }
        // Convert the byte to a two-character hex string.
        let hexByte = byte.toString(16).toUpperCase();
        if (hexByte.length === 1) {
          hexByte = "0" + hexByte;
        }
        hexData += hexByte;
      }
    }

    return { hexData };
  }

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateLabelCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // تنظیمات اولیه
    const width = 800;
    const height = 400;
    const titleFont = "100 22px geistIranYekan";
    const contentFont = "700 24px geistIranYekan";
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    // تنظیمات متن RTL
    ctx.direction = "rtl";
    ctx.font = "bold 32px geistIranYekan";
    ctx.textBaseline = "middle";

    // پس‌زمینه سفید
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);

    // --- ردیف اول (W - بارکد - blu) ---
    const headerHeight = height * (2 / 6);
    const wWidth = width * (1 / 12);
    const bluWidth = width * (1 / 12);
    const barcodeWidth = width * (5 / 6);

    drawRoundedRect(ctx, 5, 5, width - 10, headerHeight - 10, 16);

    // blu
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.fillText("blu", bluWidth / 2, headerHeight / 2);

    // 🔹 رسم بارکد در وسط
    const barcodeCanvas = document.createElement("canvas");
    ctx.drawImage(barcodeCanvas, wWidth + 20, 15, barcodeWidth - 40, 90);

    ctx.textAlign = "center";
    ctx.font = "18px Arial";
    ctx.fillText("Blu-66777245-240525184507", wWidth + barcodeWidth / 2, 110);

    // W
    ctx.font = "bold 32px geistIranYekan";
    ctx.fillText("W", bluWidth + barcodeWidth + wWidth / 2, headerHeight / 2);

    // --- بخش آدرس ---
    const addressX = 5;
    const addressY = headerHeight + 5;
    const addressWidth = width * (3 / 5) - 10;
    const addressHeight = height * (3 / 6) - 25;

    drawRoundedRect(ctx, addressX, addressY, addressWidth, addressHeight, 16);

    // متن آدرس با قابلیت شکستن خط
    ctx.textAlign = "right";
    ctx.font = contentFont;
    wrapText(
      ctx,
      "تهران تهران منطقه ۲ محله ستارخان خیابان شادمان",
      addressX + 10,
      addressY + 20,
      addressWidth - 20,
      36,
    );

    // کد پستی
    ctx.font = titleFont;
    ctx.fillText(
      "کد پستی:",
      addressX + addressWidth - 10,
      addressY + addressHeight - 20,
    );
    ctx.fillStyle = "black";
    ctx.font = contentFont;
    ctx.fillText(
      "1322654444",
      addressX + addressWidth - 120,
      addressY + addressHeight - 20,
    );

    // --- بخش گیرنده ---
    const receiverX = width * (3 / 5) + 5;
    const receiverY = headerHeight + 5;
    const receiverWidth = width * (2 / 5) - 10;
    const receiverHeight = height * (2 / 6) - 10;

    drawRoundedRect(
      ctx,
      receiverX,
      receiverY,
      receiverWidth,
      receiverHeight,
      16,
    );

    ctx.font = titleFont;
    ctx.fillText("گیرنده:", receiverX + receiverWidth - 10, receiverY + 20);

    ctx.fillStyle = "black";
    ctx.font = contentFont;
    wrapText(
      ctx,
      "محمد طاها گوینده برحقی",
      receiverX + 10,
      receiverY + 60,
      receiverWidth - 20,
      36,
    );

    // --- بخش شماره همراه ---
    const phoneX = width * (3 / 5) + 5;
    const phoneY = headerHeight + receiverHeight + 15;
    const phoneWidth = receiverWidth;
    const phoneHeight = height * (2 / 6) - 15;

    drawRoundedRect(ctx, phoneX, phoneY, phoneWidth, phoneHeight, 16);

    ctx.font = titleFont;
    ctx.fillText("شماره همراه:", phoneX + phoneWidth - 10, phoneY + 30);

    ctx.fillStyle = "black";
    ctx.font = contentFont;
    ctx.fillText("09124366419", phoneX + phoneWidth / 2 + 60, phoneY + 80);

    // --- بخش زمان تحویل ---
    const deliveryX = addressX;
    const deliveryY = headerHeight + addressHeight + 12;
    const deliveryWidth = addressWidth;
    const deliveryHeight = height * (1 / 6);

    drawRoundedRect(
      ctx,
      deliveryX,
      deliveryY,
      deliveryWidth,
      deliveryHeight,
      16,
    );

    ctx.font = "20px geistIranYekan";
    ctx.fillText(
      "زمان تحویل:",
      deliveryX + deliveryWidth - 10,
      deliveryY + deliveryHeight / 2,
    );

    ctx.fillStyle = "black";
    ctx.font = "bold 20px geistIranYekan";
    ctx.fillText(
      "پنج شنبه 1403/03/07- ساعت 08 الی 15",
      deliveryX + deliveryWidth - 110,
      deliveryY + deliveryHeight / 2,
    );
    return canvas;
  };

  const drawRoundedRect = (
    ctx: any,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.stroke();
  };

  const wrapText = (
    ctx: any,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
  ) => {
    const words = text.split(" ");
    let line = "";
    let testLine = "";
    let lineCount = 0;

    for (let n = 0; n < words.length; n++) {
      testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x + maxWidth, y + lineCount * lineHeight);
        line = words[n] + " ";
        lineCount++;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x + maxWidth, y + lineCount * lineHeight);
  };

  const testPrint = async () => {
    await requestDevice();
  };
  const LabelCanvas: ReactNode = (
    <>
      <canvas ref={canvasRef} className={"hidden"} />
    </>
  );
  return { LabelCanvas, testPrint };
};
