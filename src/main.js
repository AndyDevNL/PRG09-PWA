// Setting up variables
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
let url = 'https://cmgt.hr.nl/api/';
let projectElWrapper = document.getElementById('projects');
let tagCheck = document.getElementById('tagCheck');
let conCheck = document.getElementById('status');
let projectDb;

// Start app on Load
window.addEventListener('load', async (event) => {
    registerSW();
});

// Listen to connection changes
window.addEventListener("online", e => {
    conCheck.innerHTML = "Online my dudes!"
    return loadData();
});

window.addEventListener("offline", e => {
    conCheck.innerHTML = "Currently offline."
    return loadData();
});


// Serviceworker register
async function registerSW() {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("serviceworker.js").then(registration => {
            console.log("Serviceworker registered!");
        }).catch(err => {
            console.log("Serviceworker registration failed!");
            console.log(err);
        })
        loadData();
    }
}

// Method for initializing data
async function loadData() {
    await initiateDatabase()
    getProjects();
    getTags();
}

// Start indexed database
async function initiateDatabase() {
    let openDB = indexedDB.open("projectsDatabase", 1);

    openDB.onupgradeneeded = e => {
        openDB.result.createObjectStore('projects', {keyPath: 'id'});
        openDB.result.createObjectStore('tags');
        console.log('DB updating');
    };
    
    openDB.onsuccess = e => {
        projectDb = openDB.result;
        console.log('DB success');
    };

    openDB.onerror = e => {
        console.log('There was an error: ' + e.message);
    }
}

// First try to get projects from the network just in case they're updated
async function getProjects() {
    try {
        let resProjects = await fetch(url + 'projects');
        let dataProjects = await resProjects.json();

        let package = projectDb.transaction('projects', 'readwrite');
        let projectObSt = package.objectStore('projects');
        let projects = dataProjects['data'];
        let justProjects = []

        projects.forEach(i => {
            projectObSt.add(i.project);
            justProjects.push(i.project);
        });
        projectElWrapper.innerHTML = justProjects.map(projectEl).join('\n');
        return;
        
    }
    catch(e) {
        console.log('Cant fetch, offline');
    }

    // Get cached projects
    let package = projectDb.transaction('projects', 'readonly');
    let projectObSt = package.objectStore('projects');
    projectObSt.getAll().onsuccess = e => {
        if(e.target.result.length) {
            console.log(e.target.result);
            projectElWrapper.innerHTML = e.target.result.map(projectEl).join('\n');
        }
    }
}

// If online, get tags, else display message
async function getTags() {
    try {
        tagCheck.innerHTML= "";
        let resTags = await fetch(url + 'tags');
        let dataTags = await resTags.json();
        loadTags(dataTags);
    }
    catch {
        tagCheck.innerHTML = "Ga online om tag functionaliteit te gebruiken!";
    }
}

// Lets get some tags, built to filter multiple tags
function loadTags(tags) {
    tags.data.forEach(tag => {
        let tagCheckBox = document.createElement('input');
        let tagCheckLabel = document.createElement('label');
        tagCheckBox.value = tag.name;
        tagCheckBox.id = tag.name;
        tagCheckBox.type = 'checkbox';
        tagCheckBox.name = tag.name;
        tagCheckBox.className = 'tagCheckBox';
        tagCheckLabel.for = tag.name;
        tagCheckLabel.innerHTML = tag.name;
        tagCheck.appendChild(tagCheckBox);
        tagCheck.appendChild(tagCheckLabel);
    });

    let checkSubmit = document.createElement('button');
    checkSubmit.type = 'button';
    checkSubmit.innerHTML = 'Filter';
    checkSubmit.addEventListener('click', function () {
        filterProjects();
    });
    tagCheck.appendChild(checkSubmit);
}

// The HTML element for projects
function projectEl(data) {
    let tagArray = [];
    data['tags'].forEach( tag => {
        let tagEl = `<span>${" "+tag.name}</span>`
        tagArray.push(tagEl);
    });
    return `
        <div class="project" id="${data.id}">
            <h2 class="proTitle">${data.title}</h2>
            <p>tags: ${tagArray}</p>
            <p class="projectDesc">${data.description}</p>
            <div class="projectImageWrapper">
                <img src="${data.header_image}" alt="" class="projectsImage">
            </div>
        </div>
    `
}

// Find the tags to filter with
function filterProjects() {
    let tags = document.getElementsByClassName('tagCheckBox');
    let filterTags = [];
    for (let i = 0; i < tags.length; i++) {
        const element = tags[i];
        if (element.checked == true) {
            filterTags.push(element.id);
        }
    }
    return loadFilteredProjects(filterTags);
}

// Filter with the different tags, loop through all potential tags
async function loadFilteredProjects(check) {
    if(check.length == 0) {
        return getProjects();
    }
    let resProjects = await fetch(url + 'projects');
    let dataProjects = await resProjects.json();
    let projects = dataProjects['data'];
    let filterProject = [];
    projects.forEach(x => {
        x.project.tags.forEach(y => {
            check.forEach(z => {
                if (y.name == z) {
                    if(filterProject.includes(x) == false) {
                        filterProject.push(x);
                    }
                }
            })
        })
    });
    return projectElWrapper.innerHTML = filterProject.map(projectEl).join('\n');
}