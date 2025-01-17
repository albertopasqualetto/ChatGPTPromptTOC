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

// Add these new functions after findPrompts()
function navigateToPrompt(direction) {
	const prompts = findPrompts();
	if (prompts.length === 0) return;

	// Get all prompts with their viewport positions
	const promptPositions = prompts.map((p) => ({
		element: p,
		rect: p.getBoundingClientRect(),
	}));

	// Find the prompt that's currently most visible in viewport
	const viewportHeight = window.innerHeight;
	const currentPrompt = promptPositions.reduce((best, current) => {
		const rect = current.rect;
		const visible =
			Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
		return visible > (best?.visible || 0) ? { ...current, visible } : best;
	}, null);

	let targetPrompt;
	if (direction === "up") {
		// Find the first prompt that ends before the current prompt starts
		targetPrompt = promptPositions
			.reverse()
			.find((p) => p.rect.bottom < (currentPrompt?.rect.top || 0))
			?.element;

		// If no prompt found, go to the last one
		if (!targetPrompt) targetPrompt = prompts[prompts.length - 1];
	} else {
		// Find the first prompt that starts after the current prompt ends
		targetPrompt = promptPositions.find(
			(p) => p.rect.top > (currentPrompt?.rect.bottom || 0)
		)?.element;

		// If no prompt found, go to the first one
		if (!targetPrompt) targetPrompt = prompts[0];
	}

	if (targetPrompt) {
		// Add a small offset to ensure the prompt is fully visible
		const offset = 50;
		targetPrompt.scrollIntoView({ 
			behavior: 'smooth',
			block: 'start'
		});

		// Update active state in sidebar
		document
			.querySelectorAll("#prompt-sidebar li")
			.forEach((l) => l.classList.remove("active"));
		const link = document.querySelector(
			`#prompt-sidebar a[href="#${targetPrompt.id}"]`
		);
		if (link) link.parentElement.classList.add("active");
	}
}

// Add keyboard event listener
document.addEventListener("keydown", (e) => {
	if (e.ctrlKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
		e.preventDefault(); // Prevent default browser behavior
		showSidebarTemporarily(); // Show sidebar before navigation
		navigateToPrompt(e.key === "ArrowUp" ? "up" : "down");
	}
});

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

// Add this function after initializeSidebar()
let sidebarHideTimeout = null;

function showSidebarTemporarily() {
    const container = document.getElementById('toc-container');
    if (!container) return;

    // Clear any existing timeout
    if (sidebarHideTimeout) {
        clearTimeout(sidebarHideTimeout);
    }

    // Show sidebar
    container.classList.add('show-on-scroll');

    // Set new timeout to hide
    sidebarHideTimeout = setTimeout(() => {
        container.classList.remove('show-on-scroll');
        sidebarHideTimeout = null;
    }, 1000);
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
		link.textContent =
			promptText.length > 50
				? promptText.slice(0, 70) + "..."
				: promptText;

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
