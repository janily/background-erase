import './style.css';

import { AutoModel, AutoProcessor, env, RawImage } from '@xenova/transformers';

// Since we will download the model from the Hugging Face Hub, we can skip the local model check
env.allowLocalModels = false;
const wasmPath = 'https://jsd.onmicrosoft.cn/npm/@xenova/transformers@2.15.0/dist/ort-wasm-simd.wasm';
const absoluteWasmPath = new URL(wasmPath, location.origin).href;
env.backends.onnx.wasm.wasmPaths = {
    'ort-wasm-simd.wasm': wasmPath,
}
// Proxy the WASM backend to prevent the UI from freezing
env.backends.onnx.wasm.proxy = true;
// Constants
const EXAMPLE_URL = 'https://img.erpweb.eu.org/imgs/2024/02/79600c1573ff116d.jpg';

// Reference the elements that we will need
const status = document.getElementById('status');
const fileUpload = document.getElementById('upload');
const imageContainer = document.getElementById('container');
const example = document.getElementById('example');
const statusWrap = document.getElementById('status-wrap');
const downloadButton = document.querySelector('#downloadBtn');
const downloadWrap = document.querySelector('.block-wrap');
const uploadAgainButton = document.getElementById('uploadAgain');

// Load model and processor
status.textContent = 'Loading model...';

const model = await AutoModel.from_pretrained('briaai/RMBG-1.4', {
    // Do not require config.json to be present in the repository
    config: { model_type: 'custom' },
});

const processor = await AutoProcessor.from_pretrained('briaai/RMBG-1.4', {
    // Do not require config.json to be present in the repository
    config: {
        do_normalize: true,
        do_pad: false,
        do_rescale: true,
        do_resize: true,
        image_mean: [0.5, 0.5, 0.5],
        feature_extractor_type: "ImageFeatureExtractor",
        image_std: [1, 1, 1],
        resample: 2,
        rescale_factor: 0.00392156862745098,
        size: { width: 1024, height: 1024 },
    }
});

status.textContent = 'Ready';
statusWrap.style.display = 'none'; 

example.addEventListener('click', (e) => {
    e.preventDefault();
    predict(EXAMPLE_URL);
});

fileUpload.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) {
        return;
    }

    comparisonContainer.style.display = 'none';

    const reader = new FileReader();

    // Set up a callback when the file is loaded
    reader.onload = e2 => predict(e2.target.result);

    reader.readAsDataURL(file);
});

uploadAgainButton.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) {
        return;
    }
    imageContainer.style.display = 'block';
    comparisonContainer.style.display = 'none';
    downloadWrap.style.display = 'none';
    const reader = new FileReader();

    // Set up a callback when the file is loaded
    reader.onload = async e2 => {
        const url = e2.target.result;
        // Continue with the prediction
        await predict(url);
    };

    reader.readAsDataURL(file);
});


// 获取新添加的元素引用
const comparisonContainer = document.getElementById('image-slider');
const originalImage = document.getElementById('original-image');
const modifiedImage = document.getElementById('modified-image');

// 新增 showComparison 函数
function showComparison(originalUrl, modifiedUrl) {
  originalImage.src = originalUrl;
  modifiedImage.src = modifiedUrl;
  comparisonContainer.style.display = 'block';
  imageContainer.style.display = 'none';
}

// Predict foreground of the given image
async function predict(url) {
    // Read image
    const image = await RawImage.fromURL(url);

    // Update UI
    imageContainer.innerHTML = '';
    imageContainer.style.backgroundImage = `url(${url})`;

    // Set container width and height depending on the image aspect ratio
    const ar = image.width / image.height;
    const [cw, ch] = (ar > 720 / 480) ? [720, 720 / ar] : [480 * ar, 480];
    imageContainer.style.width = `${cw}px`;
    imageContainer.style.height = `${ch}px`;

    status.textContent = 'Analysing...';
    statusWrap.style.display = 'block';

    // Preprocess image
    const { pixel_values } = await processor(image);

    // Predict alpha matte
    const { output } = await model({ input: pixel_values });

    // Resize mask back to original size
    const mask = await RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(image.width, image.height);

    // Create new canvas
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');

    // Draw original image output to canvas
    ctx.drawImage(image.toCanvas(), 0, 0);

    // Update alpha channel
    const pixelData = ctx.getImageData(0, 0, image.width, image.height);
    for (let i = 0; i < mask.data.length; ++i) {
        pixelData.data[4 * i + 3] = mask.data[i];
    }
    ctx.putImageData(pixelData, 0, 0);

    // Update UI
    imageContainer.append(canvas);
    imageContainer.style.removeProperty('background-image');
    imageContainer.style.background = `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAGUExURb+/v////5nD/3QAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAUSURBVBjTYwABQSCglEENMxgYGAAynwRB8BEAgQAAAABJRU5ErkJggg==")`;
    status.textContent = 'Done!';
    statusWrap.style.display = 'none';

    // 更新 UI
    imageContainer.style.display = 'none';
    const dataUrl = canvas.toDataURL();
    showComparison(url, dataUrl);
    status.textContent = 'Done!';
    statusWrap.style.display = 'none';
    downloadWrap.style.display = 'block';
     // 设置下载按钮的 href 属性为图片的数据 URL
    downloadButton.href = dataUrl;
    downloadButton.download = 'modifined.png'; // 设置下载的文件名
}

async function updateUI(url) {
    // Read image
    const image = await RawImage.fromURL(url);

    // Update UI
    imageContainer.innerHTML = '';
    imageContainer.style.backgroundImage = `url(${url})`;

    // Set container width and height depending on the image aspect ratio
    const ar = image.width / image.height;
    const [cw, ch] = (ar > 720 / 480) ? [720, 720 / ar] : [480 * ar, 480];
    imageContainer.style.width = `${cw}px`;
    imageContainer.style.height = `${ch}px`;

    status.textContent = 'Analysing...';
    statusWrap.style.display = 'block';
}