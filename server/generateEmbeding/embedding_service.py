import os
import base64
import json
import tempfile
import numpy as np
import traceback
from PIL import Image
from deepface import DeepFace
import io
from fastapi import FastAPI, Request

app = FastAPI()

def validate_and_process_base64_image(base64_data, file_name="image"):
    try:
        image_data = base64.b64decode(base64_data)
        image = Image.open(io.BytesIO(image_data))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        format_mapping = {
            'JPEG': '.jpg',
            'JPG': '.jpg',
            'PNG': '.png',
            'BMP': '.bmp',
            'TIFF': '.tiff'
        }
        file_extension = format_mapping.get(image.format, '.jpg')
        output_buffer = io.BytesIO()
        image.save(output_buffer, format='JPEG', quality=95)
        processed_data = output_buffer.getvalue()
        print(f"{file_name}: Validated as {image.format} format, size: {len(processed_data)} bytes")
        return processed_data, file_extension
    except Exception as e:
        print(f"Error validating {file_name}: {e}")
        raise Exception(f"Invalid image format for {file_name}: {str(e)}")

@app.post("/get-embeddings")
async def get_embeddings(request: Request):
    try:
        body = await request.json()
        print("/get-embeddings endpoint called (FastAPI mode)")
        if 'file1' in body and 'file2' in body:
            print("Found file1 and file2 in request body")
            try:
                print("Validating and processing base64 images...")
                file1_data, file1_ext = validate_and_process_base64_image(body['file1']['data'], "file1")
                file2_data, file2_ext = validate_and_process_base64_image(body['file2']['data'], "file2")
                print(f"Processed file1 size: {len(file1_data)} bytes")
                print(f"Processed file2 size: {len(file2_data)} bytes")
                tmp_path1 = None
                tmp_path2 = None
                try:
                    with tempfile.NamedTemporaryFile(delete=False, suffix=file1_ext) as tmp1:
                        tmp1.write(file1_data)
                        tmp1.flush()
                        tmp_path1 = tmp1.name
                        print(f"Saved file1 to: {tmp_path1}")
                    with tempfile.NamedTemporaryFile(delete=False, suffix=file2_ext) as tmp2:
                        tmp2.write(file2_data)
                        tmp2.flush()
                        tmp_path2 = tmp2.name
                        print(f"Saved file2 to: {tmp_path2}")
                    if not os.path.exists(tmp_path1) or os.path.getsize(tmp_path1) == 0:
                        raise Exception("File1 was not saved properly")
                    if not os.path.exists(tmp_path2) or os.path.getsize(tmp_path2) == 0:
                        raise Exception("File2 was not saved properly")
                    print(f"File1 size: {os.path.getsize(tmp_path1)} bytes")
                    print(f"File2 size: {os.path.getsize(tmp_path2)} bytes")
                    # Pre-check: ensure both images have detectable faces
                    try:
                        print("Pre-checking face detection for file1 with DeepFace.represent (MTCNN)...")
                        emb1_check = DeepFace.represent(
                            img_path=tmp_path1,
                            model_name="ArcFace",
                            detector_backend="mtcnn",
                            enforce_detection=False
                        )
                        print(f"emb1_check: {emb1_check}")
                        print("Pre-checking face detection for file2 with DeepFace.represent (MTCNN)...")
                        emb2_check = DeepFace.represent(
                            img_path=tmp_path2,
                            model_name="ArcFace",
                            detector_backend="mtcnn",
                            enforce_detection=False
                        )
                        print(f"emb2_check: {emb2_check}")
                        if not emb1_check or not isinstance(emb1_check, list) or "embedding" not in emb1_check[0]:
                            print("No face detected in file1 during pre-check.")
                            raise Exception("No face detected in file1.")
                        if not emb2_check or not isinstance(emb2_check, list) or "embedding" not in emb2_check[0]:
                            print("No face detected in file2 during pre-check.")
                            raise Exception("No face detected in file2.")
                    except Exception as precheck_exc:
                        print(f"Pre-check failed: {precheck_exc}")
                        if tmp_path1 and os.path.exists(tmp_path1):
                            os.remove(tmp_path1)
                        if tmp_path2 and os.path.exists(tmp_path2):
                            os.remove(tmp_path2)
                        return {
                            "statusCode": 400,
                            "body": json.dumps({
                                "error": "Face not detected in one or both images during pre-check.",
                                "details": str(precheck_exc)
                            })
                        }
                    # First verify if faces match
                    try:
                        print("Calling DeepFace.verify with MTCNN...")
                        verification_result = DeepFace.verify(
                            img1_path=tmp_path1,
                            img2_path=tmp_path2,
                            model_name="ArcFace",
                            detector_backend="mtcnn"
                        )
                        print(f"Verification result: {verification_result}")
                    except Exception as verify_error:
                        print(f"Exception during DeepFace.verify: {verify_error}")
                        traceback.print_exc()
                        if tmp_path1 and os.path.exists(tmp_path1):
                            os.remove(tmp_path1)
                        if tmp_path2 and os.path.exists(tmp_path2):
                            os.remove(tmp_path2)
                        return {
                            "statusCode": 400,
                            "body": json.dumps({
                                "error": "Face verification failed",
                                "details": str(verify_error)
                            })
                        }
                    if not verification_result["verified"]:
                        os.remove(tmp_path1)
                        os.remove(tmp_path2)
                        return {
                            "statusCode": 400,
                            "body": json.dumps({
                                "error": "The faces belong to different people",
                                "distance": verification_result.get("distance", "unknown"),
                                "threshold": verification_result.get("threshold", "unknown")
                            })
                        }
                    # Get embeddings
                    try:
                        print("Generating embeddings with MTCNN...")
                        embedding1 = DeepFace.represent(
                            img_path=tmp_path1,
                            model_name="ArcFace",
                            detector_backend="mtcnn",
                            enforce_detection=False
                        )[0]["embedding"]
                        embedding2 = DeepFace.represent(
                            img_path=tmp_path2,
                            model_name="ArcFace",
                            detector_backend="mtcnn",
                            enforce_detection=False
                        )[0]["embedding"]
                    except Exception as mtcnn_error:
                        print(f"MTCNN failed, trying RetinaFace: {mtcnn_error}")
                        try:
                            embedding1 = DeepFace.represent(
                                img_path=tmp_path1,
                                model_name="ArcFace",
                                detector_backend="retinaface",
                                enforce_detection=False
                            )[0]["embedding"]
                            embedding2 = DeepFace.represent(
                                img_path=tmp_path2,
                                model_name="ArcFace",
                                detector_backend="retinaface",
                                enforce_detection=False
                            )[0]["embedding"]
                        except Exception as retinaface_exc:
                            print(f"Exception during DeepFace.represent (RetinaFace fallback): {retinaface_exc}")
                            traceback.print_exc()
                            if tmp_path1 and os.path.exists(tmp_path1):
                                os.remove(tmp_path1)
                            if tmp_path2 and os.path.exists(tmp_path2):
                                os.remove(tmp_path2)
                            return {
                                "statusCode": 400,
                                "body": json.dumps({
                                    "error": "Face embedding failed (RetinaFace fallback)",
                                    "details": str(retinaface_exc)
                                })
                            }
                    emb1 = np.array(embedding1)
                    emb2 = np.array(embedding2)
                    norm_emb1 = emb1 / np.linalg.norm(emb1)
                    norm_emb2 = emb2 / np.linalg.norm(emb2)
                    print("Embeddings generated successfully")
                    os.remove(tmp_path1)
                    os.remove(tmp_path2)
                    return {
                        "statusCode": 200,
                        "body": json.dumps({
                            "embedding1": norm_emb1.tolist(),
                            "embedding2": norm_emb2.tolist()
                        })
                    }
                except Exception as verify_error:
                    print(f"Face verification/embedding error: {verify_error}")
                    traceback.print_exc()
                    if tmp_path1 and os.path.exists(tmp_path1):
                        os.remove(tmp_path1)
                    if tmp_path2 and os.path.exists(tmp_path2):
                        os.remove(tmp_path2)
                    return {
                        "statusCode": 400,
                        "body": json.dumps({
                            "error": "Face verification failed",
                            "details": str(verify_error)
                        })
                    }
            except Exception as decode_error:
                print(f"Base64 decoding error: {decode_error}")
                return {
                    "statusCode": 400,
                    "body": json.dumps({
                        "error": "Invalid base64 data",
                        "details": str(decode_error)
                    })
                }
        else:
            print("Invalid payload format - missing file1 or file2")
            return {
                "statusCode": 400,
                "body": json.dumps({
                    "error": "Invalid payload format - expected 'file1' and 'file2' with 'data' field"
                })
            }
    except Exception as e:
        print(f"Unexpected error in /get-embeddings: {e}")
        traceback.print_exc()
        return {
            "statusCode": 500,
            "body": json.dumps({
                "error": str(e)
            })
        } 