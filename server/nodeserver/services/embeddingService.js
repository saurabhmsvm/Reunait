import axios from 'axios';
import FormData from 'form-data';

// Generate embeddings for two images and verify if they match
const generateEmbeddings = async (image1, image2) => {
    try {
        const formData = new FormData();
        formData.append('file1', image1.buffer, {
            filename: image1.originalname,
            contentType: image1.mimetype
        });
        formData.append('file2', image2.buffer, {
            filename: image2.originalname,
            contentType: image2.mimetype
        });

        const response = await axios.post('http://localhost:8000/get-embeddings', formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        if (response.data.error) {
            throw new Error(response.data.error);
        }

        const embeddings = [response.data.embedding1, response.data.embedding2];
        return embeddings;
    } catch (error) {
        console.error('Error generating embeddings:', error);
        throw error;
    }
};

export { generateEmbeddings }; 