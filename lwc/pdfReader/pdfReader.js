import { LightningElement, track } from 'lwc';
import pdfjsResource  from '@salesforce/resourceUrl/pdfjsResource';
import pdfjsWorkerResource  from '@salesforce/resourceUrl/pdfWorkerResource';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadScript } from 'lightning/platformResourceLoader';

export default class PdfReader extends LightningElement {
   
    @track pages = [];
    extractedText = '';
    isLoading = false;
    pdfLibInitialized = false;
    @track fileData;
    pdfUrl = false; // URL for the PDF
    imageType; // e.g., 'application/pdf'
    imagebase65body;
    @track images = [];

    PdfToCanvas = false;
    PdfToText = false;
    PdfToHtml = false;
    PdfToImage = false;

    renderedCallback() {
        if (this.pdfLibInitialized) return;

        Promise.all([
            loadScript(this, pdfjsResource),
            loadScript(this, pdfjsWorkerResource)
        ])
            .then(() => {
                if (window.pdfjsLib) {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerResource;
                    this.pdfLibInitialized = true;
                    console.log('PDF.js library loaded successfully.');
                } else {
                    console.error('PDF.js library is undefined.');
                }
            })
            .catch((error) => {
                console.error('Error loading PDF.js:', error);
            });
    }

    
    handleFileChange(event) {
        this.fileData = event.target.files[0];
        if(this.checkfileData())
        {
            const reader = new FileReader();
            reader.onload = () => {
                const base64Data = reader.result.split(',')[1]; // Extract base64 part
                this.imageType = this.fileData.type; // Set the file type
                this.imagebase65body = base64Data; // Set the base64 string
                const blob = new Blob([reader.result], { type: 'application/pdf' });
                this.pdfUrl = URL.createObjectURL(blob); 
            };
            reader.readAsDataURL(this.fileData);  
        }
    }



    checkfileData()
    {
        if (!this.fileData) {
            console.error('No file selected.');
            this.showToast('Error', 'No file selected.', 'error');
            return false;
        }

        // File type check (ensure it's a PDF)
        const allowedMimeType = 'application/pdf';
        if (this.fileData.type !== allowedMimeType) {
            console.error('Invalid file type. Only PDF files are allowed.');
            this.showToast('Error', 'Invalid file type. Please upload a PDF file.', 'error');
            return false;
        }

        // File size in MB (50 MB limit)
        const MAX_FILE_SIZE_MB = 1;
        const fileSizeMB = this.fileData.size / (1024 * 1024); // Convert bytes to MB
        console.log('fileSizeMB==',fileSizeMB);
        if (fileSizeMB > MAX_FILE_SIZE_MB) {
            console.error(`File is too large. The maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`);
            this.showToast('Error', `File size exceeds ${MAX_FILE_SIZE_MB} MB. Please select a smaller file.`, 'error');
            return false;
        }

        return true;

    }


    PdfToCanvasHandler()
    {
        this.PdfToCanvas = true;
        this.PdfToText = false;
        this.PdfToHtml = false;
        this.PdfToImage = false;

        if (this.checkfileData() && this.pdfLibInitialized) {
            this.isLoading = true;
            const reader = new FileReader();
            reader.onload = () => {
                const pdfData = new Uint8Array(reader.result);
                this.renderPdf(pdfData);
            };
            reader.readAsArrayBuffer(this.fileData);
        } else {
            console.error('PDF.js not initialized.');
        }
    }
    
    PdfToTextHandler()
    {
        this.PdfToText = true;
        this.PdfToCanvas = false;
        this.PdfToHtml = false;
        this.PdfToImage = false;

        if (this.checkfileData() && this.pdfLibInitialized) {
            this.isLoading = true;
            const reader = new FileReader();
            reader.onload = () => {
                const pdfData = new Uint8Array(reader.result);
                this.extractPdfText(pdfData);
            };
            reader.readAsArrayBuffer(this.fileData);
        } else {
            console.error('PDF.js not initialized.');
        }
    }

    PdfToHtmlHandler()
    {
        this.PdfToHtml = true;
        this.PdfToText = false;
        this.PdfToCanvas = false;
        this.PdfToImage = false;

        if (this.checkfileData() && this.pdfLibInitialized) {
            this.isLoading = true;
            const reader = new FileReader();
            reader.onload = () => {
                const pdfData = new Uint8Array(reader.result);
                this.extractPdfHtml(pdfData);
            };
            reader.readAsArrayBuffer(this.fileData);
        } else {
            console.error('PDF.js not initialized.');
        }
    }


 
    PdfToImageHandler() {

        this.PdfToImage = true;
        this.PdfToHtml = false;
        this.PdfToText = false;
        this.PdfToCanvas = false;

        if (this.checkfileData() && this.pdfLibInitialized) {
            this.isLoading = true;
            const reader = new FileReader();
            reader.onload = () => {
                const pdfData = new Uint8Array(reader.result);
                this.renderPdfImage(pdfData);
            };
            reader.readAsArrayBuffer(this.fileData);
        } else {
            console.error('PDF.js not initialized.');
        }
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(event);
    }

    handlePdfBase64Conversion() {
        if (this.imagebase65body && this.imageType.includes('pdf')) {

            const binaryString = atob(this.imagebase65body); // Decode base64 to binary
            const byteArray = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                byteArray[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([byteArray], { type: this.imageType }); // Create a Blob object
            this.pdfUrl = URL.createObjectURL(blob); // Create a URL for the Blob
            console.log('PDF URL created:', this.pdfUrl);
        }
    }


    get extractedTextPreview() {
        return this.extractedText || 'No text extracted yet.';
    }

    async extractPdfText(pdfData) {
        const pdfjsLib = window.pdfjsLib;
        try {
            const pdf = await pdfjsLib.getDocument(pdfData).promise;
            console.log(`PDF loaded with ${pdf.numPages} pages.`);
            const textPromises = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                textPromises.push(page.getTextContent());
            }

            const textContents = await Promise.all(textPromises);

            this.extractedText = textContents
                .map((content) =>
                    content.items.map((item) => item.str).join(' ')
                )
                .join('\n\n');

            this.isLoading = false;
        } catch (error) {
            console.error('Error extracting text:', error);
            this.isLoading = false;
        }
    }

    async extractPdfHtml(pdfData) {
        const pdfjsLib = window.pdfjsLib;
        try {
            const pdf = await pdfjsLib.getDocument(pdfData).promise;
            console.log(`PDF loaded with ${pdf.numPages} pages.`);
            let htmlContent = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();

                htmlContent += this.generateHtmlFromTextContent(textContent);
            }

            this.extractedHtml = htmlContent;
            this.isLoading = false;
            this.updateHtmlContent();
        } catch (error) {
            console.error('Error extracting text:', error);
            this.isLoading = false;
        }
    }

    generateHtmlFromTextContent(textContent) {
        const textItems = textContent.items;
        let html = '<div class="pdf-page">';
        textItems.forEach((item) => {
            const style = `font-size:${item.transform[0]}px; left:${item.transform[4]}px; top:${item.transform[5]}px;`;
            html += `<span style="${style}">${item.str}</span>`;
        });
        html += '</div>';
        return html;
    }

  

    updateHtmlContent() {
        const container = this.template.querySelector('.html-container');
        if (container) {
            container.innerHTML = this.extractedHtml;
        }
    }

    renderPdf(pdfData) {
        const pdfjsLib = window.pdfjsLib;
        pdfjsLib
            .getDocument(pdfData)
            .promise.then((pdf) => {
                console.log(`PDF loaded with ${pdf.numPages} pages.`);
                const pagePromises = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    pagePromises.push(pdf.getPage(i));
                }

                return Promise.all(pagePromises).then((pages) => {
                    this.pages = pages.map((_, index) => ({ id: index + 1 }));

                    // Wait for DOM update before rendering pages
                    setTimeout(() => {
                        pages.forEach((page, index) => {
                            const canvas = this.template.querySelector(`canvas[data-page-id="${index + 1}"]`);
                            if (canvas) {
                                this.renderPage(page, canvas);
                            }
                        });
                        this.isLoading = false;
                    }, 0);
                });
            })
            .catch((error) => {
                console.error('Error loading PDF:', error);
                this.isLoading = false;
            });
    }


    renderPdfImage(pdfData) {
        const pdfjsLib = window.pdfjsLib;
        pdfjsLib.getDocument(pdfData)
        .promise.then((pdf) => {
            const pagePromises = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                pagePromises.push(pdf.getPage(i).then((page) => {
                    return this.renderPageToCanvas(page, i); // Capture page rendering in correct order
                }));
            }

            // Wait for all pages to render
            return Promise.all(pagePromises).then((images) => {
                this.images = images; // Set all the images after all pages are rendered
                this.isLoading = false;
            });
        })
        .catch((error) => {
            console.error('Error loading PDF:', error);
            this.isLoading = false;
        });
    }

     renderPageToCanvas(page, pageNumber) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const scale = 1.5;
            const viewport = page.getViewport({ scale });

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };

            page.render(renderContext).promise.then(() => {
                // Convert the canvas to image and resolve it with the image URL
                const imageUrl = canvas.toDataURL('image/png');
                resolve(imageUrl); // Resolve the promise with the image URL
            }).catch(reject); // Handle any rendering errors
        });
    }

    renderPage(page, canvas) {
        const scale = 1.5; // Adjust the scale as needed
        const viewport = page.getViewport({ scale });

        // Set canvas dimensions
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext('2d');
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        page.render(renderContext).promise
            .then(() => {
                console.log(`Page rendered on canvas.`);
            })
            .catch((error) => {
                console.error('Error rendering page:', error);
            });
    }
           
}