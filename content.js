console.log("[ChatGPTPromptTOC] Content script loaded");

// Function to find elements with data-message-author-role="user"
function findPrompts() {
	// Select all elements having the attribute data-message-author-role="user"
	const userElements = Array.from(
		document.querySelectorAll('[data-message-author-role="user"]')
	);
	// console.log(`[ChatGPTPromptTOC] Found ${userElements.length} user messages.`);
	return userElements;
}

// Create the sidebar structure if not already present
function initializeSidebar() {
	// Check if container already exists
	let container = document.getElementById("toc-container");
	if (!container) {
		// Create container
		container = document.createElement("div");
		container.id = "toc-container";

		// Create hamburger button
		const hamburger = document.createElement("div");
		hamburger.id = "hamburger";
		hamburger.textContent = "☰"; // Unicode hamburger symbol
		container.appendChild(hamburger);

		// Create sidebar
		let sidebar = document.createElement("div");
		sidebar.id = "prompt-sidebar";

		// const header = document.createElement('h2');
		// header.textContent = 'Table of Contents';
		// sidebar.appendChild(header);

		const ul = document.createElement("ul");
		ul.id = "prompt-list";
		sidebar.appendChild(ul);

		container.appendChild(sidebar);
		document.body.appendChild(container);

		console.log("[ChatGPTPromptTOC] Sidebar and container initialized.");
	}
	return container;
}

// Update the sidebar list based on user messages
function updateSidebar() {
	const prompts = findPrompts();
	const ul = document.getElementById("prompt-list");
	if (!ul) return;

	ul.innerHTML = "";
	prompts.forEach((el, index) => {
		// Retrieve the text content of the element
		let promptText = el.textContent.trim();
		// console.log(`[ChatGPTPromptTOC] Found prompt: ${promptText}`);

		// Ensure each user message element has a unique ID for linking
		let promptId = el.id;
		if (!promptId) {
		  promptId = "prompt-" + index;
		  el.id = promptId;
		}

		const li = document.createElement("li");
		const link = document.createElement("a");
		link.textContent =promptText.length > 50 ? promptText.slice(0, 70) + "..." : promptText;

		// Instead of relying solely on href, handle click events manually
		link.href = "#" + promptId;
		link.style.cursor = "pointer";

		// Attach click listener to scroll smoothly to the target element
		link.addEventListener("click", (e) => {
			e.preventDefault();

			// Remove active class from all links
			document
				.querySelectorAll("#prompt-sidebar li")
				.forEach((l) => l.classList.remove("active"));
			// Add active class to this clicked link
			li.classList.add("active");

			const target = document.getElementById(promptId);
			if (target) {
				target.scrollIntoView({ behavior: "smooth", block: "start" });
			}
		});

		li.appendChild(link);
		ul.appendChild(li);
	});
	// console.log(`[ChatGPTPromptTOC] Sidebar updated with ${prompts.length} entries.`);
}

// Initialize sidebar and set up dynamic updates immediately
initializeSidebar();

const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		// Only update if new nodes are added and they contain user messages
		if (
			mutation.addedNodes.length &&
			Array.from(mutation.addedNodes).some((node) =>
			node.querySelector?.('[data-message-author-role="user"]')
			)
		) {
			updateSidebar();
			break;
		}
	}
});

observer.observe(document.body, {
	childList: true,
	subtree: true,
});

// Function to check for empty prompts and retry updating
function retryUpdateIfEmpty() {
	const prompts = findPrompts();
	if (
		prompts.length === 0 ||
		prompts.some((el) => !el || el.textContent.trim() == "")
	) {
		setTimeout(() => {
			updateSidebar();
			retryUpdateIfEmpty();
		}, 500);
	}
}

// Start checking for empty prompts
retryUpdateIfEmpty();
