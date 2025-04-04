// Configuration
const TMDB_API = {
    IMAGE_BASE: 'https://image.tmdb.org/t/p/w500'
};

// Media Configuration
const mediaConfig = {
    anime: {
        api: async (query, page) => {
            const animeQuery = JSON.stringify({
                query: `
                    query ($page: Int, $perPage: Int, $search: String) {
                        Page(page: $page, perPage: $perPage) {
                            media(type: ANIME, search: $search) {
                                id
                                title { romaji }
                                coverImage { large }
                                startDate { year }
                            }
                        }
                    }`,
                variables: {
                    search: query,
                    page,
                    perPage: 10
                }
            });

            try {
                const response = await fetch("https://graphql.anilist.co", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: animeQuery
                });
                const { data } = await response.json();
                return data?.Page?.media || [];
            } catch (error) {
                console.error("Anime API Error:", error);
                return [];
            }
        },
        formatter: item => ({
            title: item.title?.romaji || "Unknown Anime",
            image: item.coverImage?.large || "placeholder.jpg",
            year: item.startDate?.year || '',
            type: "anime"
        })
    },
    movie: {
        api: async (query, page = 1) => {
            try {
                const response = await fetch(
                    `/api/tmdb?endpoint=/search/movie&query=${encodeURIComponent(query)}&page=${page}`
                );
                const data = await response.json();
                return data.results || [];
            } catch (error) {
                console.error("Movie API Error:", error);
                return [];
            }
        },
        formatter: item => ({
            title: item.title || "Unknown Movie",
            image: item.poster_path 
                ? `${TMDB_API.IMAGE_BASE}${item.poster_path}`
                : "placeholder.jpg",
            year: item.release_date?.split('-')[0] || 'N/A',
            type: "movie"
        })
    },
    drama: {
        api: async (query, page = 1) => {
            try {
                const response = await fetch(
                    `/api/tmdb?endpoint=/search/tv&query=${encodeURIComponent(query)}&page=${page}`
                );
                const data = await response.json();
                return data.results || [];
            } catch (error) {
                console.error("Drama API Error:", error);
                return [];
            }
        },
        formatter: item => ({
            title: item.name || "Unknown Drama",
            image: item.poster_path 
                ? `${TMDB_API.IMAGE_BASE}${item.poster_path}`
                : "placeholder.jpg",
            year: item.first_air_date?.split('-')[0] || 'N/A',
            type: "drama"
        })
    }
};

// Utility Functions
const debounce = (func, delay = 300) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

const clearSearch = () => {
    const searchInput = document.getElementById("searchInput");
    searchInput.value = "";
    searchInput.focus();
    
    document.getElementById("suggestions").style.display = "none";
    ["anime", "movie", "drama"].forEach(type => {
        document.getElementById(`${type}Results`).innerHTML = "";
    });
};

// DOM Rendering Functions
const renderResults = (items, containerId) => {
    const container = document.getElementById(containerId);
    container.innerHTML = items.length ? "" : `<div class="no-results">No results found</div>`;

    items.forEach(item => {
        const card = document.createElement("div");
        card.className = "result-item";
        
        const formatted = mediaConfig[item.type].formatter(item);
        
        card.innerHTML = `
            <img src="${formatted.image}" alt="${formatted.title}" loading="lazy">
            <div class="result-info">
                <h3>${formatted.title}</h3>
                ${formatted.year ? `<p>${formatted.year}</p>` : ''}
            </div>
        `;
        
        container.appendChild(card);
    });
};

const renderSuggestions = (suggestions) => {
    const container = document.getElementById("suggestions");
    container.innerHTML = "";
    
    if (!suggestions.length) {
        container.style.display = "none";
        return;
    }

    suggestions.forEach((item, index) => {
        const suggestion = document.createElement("div");
        suggestion.className = `suggestion-item ${index === 0 ? "highlighted" : ""}`;
        
        const formatted = mediaConfig[item.type].formatter(item);
        suggestion.textContent = formatted.title;
        
        suggestion.onclick = () => {
            document.getElementById("searchInput").value = formatted.title;
            container.style.display = "none";
        };
        
        container.appendChild(suggestion);
    });
    
    container.style.display = "block";
};

// Data Fetching Functions
const fetchSuggestions = debounce(async (query) => {
    if (!query.trim()) {
        document.getElementById("suggestions").style.display = "none";
        return;
    }

    const container = document.getElementById("suggestions");
    container.innerHTML = "<div class='loading'>Searching...</div>";
    container.style.display = "block";

    try {
        const [anime, movies, dramas] = await Promise.all([
            mediaConfig.anime.api(query, 1),
            mediaConfig.movie.api(query, 1),
            mediaConfig.drama.api(query, 1)
        ]);

        const suggestions = [
            ...anime.slice(0, 3).map(i => ({ ...i, type: "anime" })),
            ...movies.slice(0, 3).map(i => ({ ...i, type: "movie" })),
            ...dramas.slice(0, 3).map(i => ({ ...i, type: "drama" }))
        ].filter(i => i.title || i.name);

        renderSuggestions(suggestions);
    } catch (error) {
        console.error("Suggestions Error:", error);
        container.innerHTML = "<div class='error'>Failed to load suggestions</div>";
    }
});

const searchContent = async () => {
    const query = document.getElementById("searchInput").value.trim();
    if (!query) return;

    try {
        const [anime, movies, dramas] = await Promise.all([
            mediaConfig.anime.api(query, 1),
            mediaConfig.movie.api(query, 1),
            mediaConfig.drama.api(query, 1)
        ]);

        renderResults(
            anime.map(i => ({ ...i, type: "anime" })),
            "animeResults"
        );
        renderResults(
            movies.map(i => ({ ...i, type: "movie" })),
            "movieResults"
        );
        renderResults(
            dramas.map(i => ({ ...i, type: "drama" })),
            "dramaResults"
        );
    } catch (error) {
        console.error("Search Error:", error);
        alert("Failed to complete search. Please try again.");
    }
};

// Event Handlers
const handleKeyboardNav = (e) => {
    const items = Array.from(document.querySelectorAll(".suggestion-item"));
    if (!items.length) return;

    const current = document.querySelector(".highlighted");
    let newIndex = current ? items.indexOf(current) : -1;

    switch(e.key) {
        case "ArrowDown":
            e.preventDefault();
            newIndex = (newIndex + 1) % items.length;
            break;
        case "ArrowUp":
            e.preventDefault();
            newIndex = (newIndex - 1 + items.length) % items.length;
            break;
        case "Enter":
            if (current) {
                document.getElementById("searchInput").value = current.textContent;
                document.getElementById("suggestions").style.display = "none";
            }
            return;
        default:
            return;
    }

    items.forEach(item => item.classList.remove("highlighted"));
    const newItem = items[newIndex];
    newItem.classList.add("highlighted");
    newItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
};

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    const searchButton = document.getElementById("searchButton");
    const clearButton = document.getElementById("clearButton");

    searchInput.addEventListener("input", (e) => fetchSuggestions(e.target.value));
    searchInput.addEventListener("keydown", handleKeyboardNav);
    searchButton.addEventListener("click", searchContent);
    clearButton.addEventListener("click", clearSearch);

    document.addEventListener("click", (e) => {
        if (!e.target.closest("#searchInput, #suggestions")) {
            document.getElementById("suggestions").style.display = "none";
        }
    });
});