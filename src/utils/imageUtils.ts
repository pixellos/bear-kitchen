/**
 * Safely generates an image URL from a string or Blob.
 * Handles null/undefined and avoids calling createObjectURL on non-blobs.
 */
export const getSafeImageUrl = (img: string | Blob | null | undefined): string | undefined => {
    if (!img) return undefined;
    if (typeof img === 'string') return img;
    if (img instanceof Blob) {
        try {
            return URL.createObjectURL(img);
        } catch (e) {
            console.error('Failed to create object URL:', e);
            return undefined;
        }
    }
    return undefined;
};

/**
 * Gets the first valid image URL from an array or single image field.
 */
export const getFirstImageUrl = (imageField: (string | Blob | null | undefined)[] | string | Blob | null | undefined): string | undefined => {
    if (!imageField) return undefined;
    if (Array.isArray(imageField)) {
        if (imageField.length === 0) return undefined;
        const firstImg = imageField.find(img => img !== null && img !== undefined);
        return getSafeImageUrl(firstImg);
    }
    return getSafeImageUrl(imageField);
};
