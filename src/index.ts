/**
 * 图片故事生成器 - Cloudflare Worker 后端
 */

export interface Env {
	AI: Ai;
}

const AUTHOR_STYLES: Record<string, string> = {
	"fitzgerald": "F.S.菲茨杰拉德（《了不起的盖茨比》）：辞藻华丽、抒情浪漫，略带迷惘与怀旧的忧郁感，擅长营造精致的氛围与细腻的情感表达",
	"alcott": "路易莎·梅·奥尔科特（《小妇人》）：温暖治愈、生活气息浓厚，文字细腻温柔，充满家庭温情与成长的力量",
	"bingxin": "冰心（中国现代散文家）：清新淡雅、简约克制，文字充满诗意与自然哲思，语言纯净、情感真挚",
	"murakami": "村上春树（日本作家）：疏离感强、文艺细腻，擅长营造独特的氛围感，文字简洁却富有深意",
	"luxun": "鲁迅（中国现代文学家）：冷峻深刻、直白犀利，文字兼具批判性与思想性，表达简洁有力"
};

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		};

		if (request.method === "OPTIONS") {
			return new Response(null, { headers: corsHeaders });
		}

		if (url.pathname === "/api/generate" && request.method === "POST") {
			return handleGenerate(request, env, corsHeaders);
		}

		if (url.pathname === "/api/styles") {
			return new Response(JSON.stringify(Object.keys(AUTHOR_STYLES)), {
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}

		return new Response(html, {
			headers: { ...corsHeaders, "Content-Type": "text/html" },
		});
	},
} satisfies ExportedHandler<Env>;

async function handleGenerate(
	request: Request,
	env: Env,
	corsHeaders: Record<string, string>
): Promise<Response> {
	try {
		const body = await request.json();
		const { images, style, description } = body;

		if (!style || !AUTHOR_STYLES[style]) {
			return new Response(
				JSON.stringify({ error: "请选择有效的作家风格" }),
				{ status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
			);
		}

		const authorInfo = AUTHOR_STYLES[style];
		const userDescription = description || "无";
		
		const prompt = `请根据以下用户上传的图片和描述，模仿${authorInfo}的写作风格创作一段短篇故事。要求：字数控制在200-300字，语言生动形象，富有画面感，紧扣图片场景，贴合该作者的句式、用词习惯，不添加任何Markdown格式，仅返回纯文本故事。用户描述：${userDescription}`;

		const messages = [
			{
				role: "user" as const,
				content: [
					{ type: "text" as const, text: prompt },
					...images.slice(0, 5).map((img: string) => ({
						type: "image_url" as const,
						image_url: { url: img }
					}))
				]
			}
		];

		const aiResponse = await env.AI.run("@cf/meta/llama-4-scout-enchanted", {
			messages,
			max_tokens: 500,
		});

		const story = aiResponse.response?.trim() || "生成失败，请重试";

		return new Response(JSON.stringify({ story }), {
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});

	} catch (error) {
		console.error("Error:", error);
		return new Response(
			JSON.stringify({ error: "生成失败，请重试或更换图片/描述" }),
			{ status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
		);
	}
}

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>图片故事生成器</title>
	<style>
		* { margin: 0; padding: 0; box-sizing: border-box; }
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8f9fa; min-height: 100vh; }
		.container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
		h1 { text-align: center; color: #333; margin-bottom: 30px; }
		.step { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
		.step-title { font-size: 18px; font-weight: 600; color: #333; margin-bottom: 16px; display: flex; align-items: center; }
		.step-num { background: #4a90d9; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; margin-right: 8px; }
		.upload-area { border: 2px dashed #ddd; border-radius: 8px; padding: 40px; text-align: center; cursor: pointer; transition: all 0.2s; }
		.upload-area:hover { border-color: #4a90d9; background: #f8f9ff; }
		.upload-area.dragover { border-color: #4a90d9; background: #f0f4ff; }
		.preview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; margin-top: 16px; }
		.preview-item { position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; }
		.preview-item img { width: 100%; height: 100%; object-fit: cover; }
		.preview-item .remove { position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 14px; }
		.styles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
		.style-option { border: 2px solid #eee; border-radius: 8px; padding: 16px; cursor: pointer; transition: all 0.2s; }
		.style-option:hover { border-color: #4a90d9; }
		.style-option.selected { border-color: #4a90d9; background: #f0f4ff; }
		.style-name { font-weight: 600; color: #333; margin-bottom: 4px; }
		.style-desc { font-size: 12px; color: #666; }
		textarea { width: 100%; min-height: 100px; padding: 12px; border: 2px solid #eee; border-radius: 8px; font-size: 14px; resize: vertical; }
		textarea:focus { outline: none; border-color: #4a90d9; }
		.btn { background: #4a90d9; color: white; border: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; cursor: pointer; width: 100%; transition: all 0.2s; }
		.btn:hover { background: #3a7bc8; }
		.btn:disabled { background: #ccc; cursor: not-allowed; }
		.btn.loading { opacity: 0.7; pointer-events: none; }
		.result { text-align: center; }
		.result-img { max-width: 100%; border-radius: 8px; margin-bottom: 20px; }
		.result-story { background: #f8f9fa; padding: 24px; border-radius: 8px; text-align: left; line-height: 1.8; white-space: pre-wrap; }
		.result-actions { display: flex; gap: 12px; margin-top: 20px; }
		.result-actions .btn { flex: 1; }
		.tip { font-size: 12px; color: #999; margin-top: 8px; }
		.error { background: #fee; color: #c00; padding: 12px; border-radius: 8px; margin-top: 12px; text-align: center; }
	</style>
</head>
<body>
	<div class="container">
		<h1>📖 图片故事生成器</h1>
		
		<div id="step1" class="step">
			<div class="step-title"><span class="step-num">1</span>上传图片（1-5张）</div>
			<div class="upload-area" id="uploadArea">
				<div>点击或拖拽上传图片</div>
				<div class="tip">支持 JPG、PNG，≤5MB/张</div>
			</div>
			<input type="file" id="fileInput" accept="image/jpeg,image/png" multiple hidden>
			<div class="preview-grid" id="previewGrid"></div>
		</div>

		<div id="step2" class="step">
			<div class="step-title"><span class="step-num">2</span>选择风格与补充描述</div>
			<div class="styles-grid" id="stylesGrid"></div>
			<div style="margin-top: 20px;">
				<div class="step-title" style="font-size: 14px;">给故事的小提示（可选）</div>
				<textarea id="description" placeholder="想表达的心情、场景或故事背景..." maxlength="200"></textarea>
				<div class="tip"><span id="descLen">0</span>/200字</div>
			</div>
		</div>

		<button class="btn" id="generateBtn" disabled>生成专属故事</button>
		<div id="error" class="error" style="display: none;"></div>

		<div id="result" class="step" style="display: none;">
			<div class="result">
				<div class="preview-grid" id="resultImages"></div>
				<div class="result-story" id="resultStory"></div>
				<div class="result-actions">
					<button class="btn" id="copyBtn">复制故事</button>
					<button class="btn" id="retryBtn">重新生成</button>
				</div>
			</div>
		</div>
	</div>

	<script>
		const styles = [
			{ id: "fitzgerald", name: "F.S.菲茨杰拉德", desc: "《了不起的盖茨比》- 辞藻华丽、抒情浪漫" },
			{ id: "alcott", name: "路易莎·梅·奥尔科特", desc: "《小妇人》- 温暖治愈、细腻温柔" },
			{ id: "bingxin", name: "冰心", desc: "中国现代散文家- 清新淡雅、诗意自然" },
			{ id: "murakami", name: "村上春树", desc: "日本作家- 疏离文艺、简洁富有深意" },
			{ id: "luxun", name: "鲁迅", desc: "中国现代文学家- 冷峻深刻、直白犀利" }
		];

		let images = [];
		let selectedStyle = null;

		const stylesGrid = document.getElementById("stylesGrid");
		styles.forEach(s => {
			const div = document.createElement("div");
			div.className = "style-option";
			div.innerHTML = '<div class="style-name">' + s.name + '</div><div class="style-desc">' + s.desc + '</div>';
			div.onclick = () => {
				document.querySelectorAll(".style-option").forEach(o => o.classList.remove("selected"));
				div.classList.add("selected");
				selectedStyle = s.id;
				checkGenerateBtn();
			};
			stylesGrid.appendChild(div);
		});

		const uploadArea = document.getElementById("uploadArea");
		const fileInput = document.getElementById("fileInput");

		uploadArea.onclick = () => fileInput.click();
		uploadArea.ondragover = e => { e.preventDefault(); uploadArea.classList.add("dragover"); };
		uploadArea.ondragleave = () => uploadArea.classList.remove("dragover");
		uploadArea.ondrop = e => { e.preventDefault(); uploadArea.classList.remove("dragover"); handleFiles(e.dataTransfer.files); };
		fileInput.onchange = () => handleFiles(fileInput.files);

		function handleFiles(files) {
			for (const file of files) {
				if (images.length >= 5) break;
				if (!file.type.match(/image\/(jpeg|png)/)) continue;
				if (file.size > 5 * 1024 * 1024) continue;

				const reader = new FileReader();
				reader.onload = e => {
					images.push(e.target.result);
					renderPreviews();
					checkGenerateBtn();
				};
				reader.readAsDataURL(file);
			}
		}

		function renderPreviews() {
			const grid = document.getElementById("previewGrid");
			grid.innerHTML = "";
			images.forEach((img, i) => {
				const div = document.createElement("div");
				div.className = "preview-item";
				div.innerHTML = '<img src="' + img + '"><button class="remove" onclick="removeImage(' + i + ')">×</button>';
				grid.appendChild(div);
			});
		}

		function removeImage(i) {
			images.splice(i, 1);
			renderPreviews();
			checkGenerateBtn();
		}

		const description = document.getElementById("description");
		description.oninput = () => { document.getElementById("descLen").textContent = description.value.length; };

		function checkGenerateBtn() {
			const btn = document.getElementById("generateBtn");
			btn.disabled = images.length === 0 || !selectedStyle;
		}

		const generateBtn = document.getElementById("generateBtn");
		const errorDiv = document.getElementById("error");

		generateBtn.onclick = async () => {
			generateBtn.disabled = true;
			generateBtn.textContent = "正在为你编织故事…";
			generateBtn.classList.add("loading");
			errorDiv.style.display = "none";

			try {
				const res = await fetch("/api/generate", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ images, style: selectedStyle, description: description.value })
				});
				const data = await res.json();

				if (data.error) {
					errorDiv.textContent = data.error;
					errorDiv.style.display = "block";
				} else {
					showResult(data.story);
				}
			} catch (e) {
				errorDiv.textContent = "生成失败，请重试";
				errorDiv.style.display = "block";
			}

			generateBtn.disabled = false;
			generateBtn.textContent = "生成专属故事";
			generateBtn.classList.remove("loading");
		};

		function showResult(story) {
			document.getElementById("step1").style.display = "none";
			document.getElementById("step2").style.display = "none";
			generateBtn.style.display = "none";

			const resultDiv = document.getElementById("result");
			resultDiv.style.display = "block";

			const resultImages = document.getElementById("resultImages");
			resultImages.innerHTML = images.map(img => '<img class="result-img" src="' + img + '">').join("");

			document.getElementById("resultStory").textContent = story;
		}

		document.getElementById("copyBtn").onclick = () => {
			navigator.clipboard.writeText(document.getElementById("resultStory").textContent);
			document.getElementById("copyBtn").textContent = "复制成功 ✓";
			setTimeout(() => document.getElementById("copyBtn").textContent = "复制故事", 2000);
		};

		document.getElementById("retryBtn").onclick = () => {
			document.getElementById("result").style.display = "none";
			document.getElementById("step1").style.display = "block";
			document.getElementById("step2").style.display = "block";
			generateBtn.style.display = "block";
			images = [];
			selectedStyle = null;
			renderPreviews();
			document.querySelectorAll(".style-option").forEach(o => o.classList.remove("selected"));
			checkGenerateBtn();
		};
	</script>
</body>
</html>`;
