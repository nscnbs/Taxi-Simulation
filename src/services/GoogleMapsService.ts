export const loadGoogleMapsAPI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      reject("Google Maps API key is missing");
      return;
    }

    if (
      (window as any).google &&
      (window as any).google.maps &&
      (window as any).google.maps.importLibrary
    ) {
      resolve();
      return;
    }

    const existingScript = document.getElementById("googleMapsScript");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      return;
    }

    const script = document.createElement("script");
    script.id = "googleMapsScript";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&v=beta`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();
    script.onerror = (error) => reject(error);

    document.head.appendChild(script);
  });
};
