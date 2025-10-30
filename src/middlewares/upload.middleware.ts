// import { Request, Response, NextFunction } from "express";
// import multer from "multer";
// import path from "path";
// import fs from "fs";

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const uploadDir = "uploads/";
//     if (!fs.existsSync(uploadDir)) {
//       fs.mkdirSync(uploadDir, { recursive: true });
//     }
//     cb(null, uploadDir);
//   },
//   filename: (req: Request, file, cb) => {
//     const extension = path.extname(file.originalname);
//     cb(null, `${Date.now()}${extension}`);
//   },
// });

// const uploadMiddleware = multer({
//   storage,
// });

// const uploadFile = () => (req: Request, res: Response) => {
//   const uploadSingle = uploadMiddleware.single("file");

//   uploadSingle(req, res, (err: any) => {
//     if (err instanceof multer.MulterError) {
//       res.status(400).json({ error: err.message });
//     } else if (err) {
//       res.status(400).json({ error: err.message });
//     }

//     const filePath = path.join("/uploads", req.file?.filename || "");

//     res.status(200).json({
//       message: "File uploaded successfully!",
//       url: filePath,
//     });
//   });
// };

// export { uploadFile };
