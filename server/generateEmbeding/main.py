from fastapi import FastAPI
from deepface import DeepFace
import numpy as np
import json
from mangum import Mangum
import os
import glob
import shutil

app = FastAPI()

def copy_weights_to_deepface_location():
    """Copy weights from persistent storage to DeepFace's expected location"""
    try:
        source_weights_path = "/var/task/.deepface/weights"
        deepface_weights_path = "/tmp/.deepface/weights"
        
        if os.path.exists(source_weights_path):
            files = os.listdir(source_weights_path)
            print(f"Found {len(files)} weight files in persistent storage")
            
            # Copy weights to where DeepFace expects them
            os.makedirs(deepface_weights_path, exist_ok=True)
            
            for file in files:
                source_file = os.path.join(source_weights_path, file)
                target_file = os.path.join(deepface_weights_path, file)
                if not os.path.exists(target_file):
                    shutil.copy2(source_file, target_file)
            
            print("Weights copied to DeepFace location successfully")
            return True
        else:
            print("WARNING: Source weights directory not found - models will be downloaded")
            return False
    except Exception as e:
        print(f"Error copying weights: {e}")
        return False

# Copy weights during module import
try:
    copy_weights_to_deepface_location()
    print("Module initialization completed successfully")
except Exception as e:
    print(f"Weight copying failed at startup: {e}")

def extract_embedding(result):
    """Extract embedding from DeepFace represent result"""
    if isinstance(result, list):
        if len(result) == 0:
            raise Exception("No embedding found in result")
        if isinstance(result[0], float) or isinstance(result[0], np.floating):
            return result
        if isinstance(result[0], dict) and "embedding" in result[0]:
            return result[0]["embedding"]
    raise Exception("Unexpected embedding format")

def cleanup_tmp_images():
    """Clean up temporary image files (only .jpg, .jpeg, .png in /tmp)"""
    try:
        for ext in ('jpg', 'jpeg', 'png'):
            files = glob.glob(f'/tmp/*.{ext}')
            for f in files:
                try:
                    os.remove(f)
                except Exception:
                    pass
    except Exception:
        pass

def normalize_embedding(embedding):
    """Safely normalize embedding vector"""
    try:
        emb_array = np.array(embedding)
        norm = np.linalg.norm(emb_array)
        if norm == 0:
            raise Exception("Embedding vector has zero norm")
        return emb_array / norm
    except Exception as e:
        print(f"Error normalizing embedding: {e}")
        raise Exception(f"Failed to normalize embedding: {e}")

def lambda_handler(event, context):
    print(f"Lambda handler started - {context.get_remaining_time_in_millis()}ms remaining")
    try:
        # Parse input
        url1 = event.get('url1')
        url2 = event.get('url2')
        do_verify = event.get('do_verify', True)
        
        if url1 is None or url2 is None:
            return {
                "statusCode": 400,
                "body": json.dumps({
                    "error": "Missing 'url1' or 'url2' in request"
                })
            }
        
        verification_result = None
        detection_method = None
        
        # Step 1: Verification if requested
        if do_verify:
            try:
                verification_result = DeepFace.verify(
                    img1_path=url1,
                    img2_path=url2,
                    model_name="ArcFace",
                    detector_backend="mtcnn",
                    enforce_detection=True
                )
                detection_method = "mtcnn"
                print(f"verified: {verification_result.get('verified')}, detector_backend: {verification_result.get('detector_backend')}")
            except Exception as mtcnn_exc:
                print(f"MTCNN verify failed: {mtcnn_exc}. Trying RetinaFace fallback...")
                try:
                    verification_result = DeepFace.verify(
                        img1_path=url1,
                        img2_path=url2,
                        model_name="ArcFace",
                        detector_backend="retinaface",
                        enforce_detection=True
                    )
                    detection_method = "retinaface"
                    print(f"verified: {verification_result.get('verified')}, detector_backend: {verification_result.get('detector_backend')}")
                except Exception as retinaface_exc:
                    print(f"RetinaFace verify failed: {retinaface_exc}")
                    return {
                        "statusCode": 400,
                        "body": json.dumps({
                            "error": "Face verification failed with both MTCNN and RetinaFace",
                            "details": str(retinaface_exc)
                        })
                    }
            if not verification_result["verified"]:
                print("Face verification failed - faces belong to different people")
                return {
                    "statusCode": 400,
                    "body": json.dumps({
                        "error": "The faces belong to different people"
                    })
                }
        
        # Step 2: Generate embeddings using the same detector as verification (or MTCNN if no verification)
        def get_embedding(url, detector_backend):
            try:
                result = DeepFace.represent(
                    img_path=url,
                    model_name="ArcFace",
                    detector_backend=detector_backend,
                    enforce_detection=False
                )
                return extract_embedding(result)
            except Exception as exc:
                print(f"{detector_backend} embedding failed for {url}: {exc}")
                raise Exception(f"No face found in image: {url}")
        
        embedding_detector = detection_method if detection_method else "mtcnn"
        print(f"Generating embeddings using {embedding_detector} (same as verification)...")
        print("Generating embedding for image1...")
        embedding1 = get_embedding(url1, embedding_detector)
        print("Generating embedding for image2...")
        embedding2 = get_embedding(url2, embedding_detector)
        
        # Normalize embeddings safely
        norm_emb1 = normalize_embedding(embedding1)
        norm_emb2 = normalize_embedding(embedding2)
        
        # Ensure embeddings are JSON serializable
        response = {
            "embedding1": norm_emb1.tolist() if hasattr(norm_emb1, 'tolist') else norm_emb1,
            "embedding2": norm_emb2.tolist() if hasattr(norm_emb2, 'tolist') else norm_emb2
        }
        
        cleanup_tmp_images()  # Clean up temp images before returning
        return {
            "statusCode": 200,
            "body": json.dumps(response)
        }
    except Exception as e:
        print(f"Unexpected error in lambda_handler: {e}")
        cleanup_tmp_images()  # Clean up temp images even on error
        return {
            "statusCode": 500,
            "body": json.dumps({
                "error": str(e)
            })
        }

handler = Mangum(app)
