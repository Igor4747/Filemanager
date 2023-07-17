const express = require("express")
const hbs = require('express-handlebars');
const app = express()
const path = require("path")
const http = require('http');
const server = http.createServer(app); // tu zmiana
const formidable = require('formidable');
const PORT = 4000;
const fs = require("fs");
const { callbackify } = require("util");
const { text } = require("express");
const { Server } = require("socket.io");
const socketio = new Server(server);


app.set('views', path.join(__dirname, 'views')); // ustalamy katalog views
app.engine('hbs', hbs({
    defaultLayout: 'main.hbs', // domyślny layout, potem można go zmienić
    extname: '.hbs',
    partialsDir: 'views/partials',
}));
app.set('view engine', 'hbs');



let foldersTab = []   //tablica folderow
let filesTab = []   //tablica plikow


let idDir = 0
let idFile = 0

let pathTab = [] //tablica z poszczegolnymi katlogami roota 
let pathlinks = [] //tablica z poszczegolnymi scizekami katlogow roota 
let fullPathTab = [] //dwie powyzsze tablice w jednej

let rootTab = []  //tablica do zapisu biezacej sciezki
let rootPath = "" //biezaca sciezka w stringu

const filepath = path.join(__dirname, "files")//domyslna sciezka pliku lub folderu

//context
const fullContext = {
    path: fullPathTab,
    foldersTab: foldersTab,
    filesTab: filesTab,
}

//wczytywanie plikow z biezacego katalogu
function readRoot() {
    idDir = 0
    idFile = 0
    foldersTab = []
    filesTab = []
    const filepath = readFilepath()
    fs.readdir(filepath, (err, files) => {
        if (err) throw err
        files.forEach((file) => {
            fs.lstat(path.join(filepath, file), (err, stats) => {
                if (stats.isDirectory() == true) {
                    idDir++
                    foldersTab.push({ dir: file, id: idDir })
                }
                else {
                    idFile++
                    filesTab.push({ plik: file, id: idFile })
                }
            })
        })
        // console.log(filepath)
    })
    pathTab = []
    pathTab.push("home")
    rootTab.forEach(addDir)
    function addDir(item) {
        pathTab.push(item)
    }
    // console.log(pathTab)
    pathlinks = []
    pathTab.forEach(addLink)
    function addLink(item, index) {
        let tab = []
        for (i = 0; i <= index; i++) {
            tab.push(pathTab[i])
        }
        pathlinks.push(tab)
    }
    fullPathTab = []
    pathTab.forEach(fullPath)
    function fullPath(item, index) {
        fullPathTab.push({ name: item, link: pathlinks[index] })
    }
    // console.log(fullPathTab)
    // console.log("links", pathlinks)

}

//wczytywanie sciezki biezacego katalogu
function readFilepath() {
    if (rootTab[0]) {
        rootPath = ""
        rootTab.forEach(addRootPath)
        function addRootPath(item, index) {
            if (index == 0) {
                rootPath = item
            }
            else {
                rootPath += "/" + item
            }
        }
        if (rootTab[1]) {
            rootPath = rootPath.toString();
            // console.log(rootPath)
        }
        // console.log(rootPath)
        return path.join(__dirname, "files", rootPath) //sciezka pliku lub folderu
    }
    else {
        // console.log(path.join(__dirname, "files"))
        return path.join(__dirname, "files")
    }
}

//strona glowna
app.get("/", function (req, res) {
    rootTab = []
    readRoot()
    const fullContext = {
        path: fullPathTab,
        foldersTab: foldersTab,
        filesTab: filesTab,
    }
    // console.log(fullContext.path)
    res.render('Filemanager.hbs', fullContext);
})

//upload plikow
app.post('/handleUpload', function (req, res) {

    let form = formidable({});

    form.multiples = true //wiecej nuz 1 plik

    form.keepExtensions = true // zapis z rozszerzeniem pliku

    // form.uploadDir = __dirname + '/files' // folder do zapisu zdjęcia

    form.uploadDir = readFilepath() // folder do zapisu zdjęcia


    form.parse(req, function (err, fields, files) {
        // console.log(fields); //przeslane pola z formularza
        // console.log(files.upload); //przesłane formularzem pliki
        // // console.log(files.upload.size);
        // // console.log(files.upload.name);
        // console.log(files.upload.type);
        // // console.log(files.upload.path);

        let fileName

        if (files.upload[1]) {
            for (let i = 0; i < files.upload.length; i++) {
                idFile++
                console.log(files.upload.path)
                fileName = files.upload[i].path.slice(50)
                let file = {
                    id: idFile,
                    plik: fileName,
                    // type: files.upload[i].type,
                    // path: files.upload[i].path,
                    // size: files.upload[i].size,
                    // saveDate: new Date().getTime()
                }
                filesTab.push(file)
            }
            readRoot()
            const fullContext = {
                path: fullPathTab,
                foldersTab: foldersTab,
                filesTab: filesTab,
            }
            res.render('FileManager.hbs', fullContext)
        }
        else {
            idFile++
            fileName = files.upload.path.slice(50)
            let file = {
                id: idFile,
                plik: fileName,
                // type: files.upload.type,
                // path: files.upload.path,
                // size: files.upload.size,
                // saveDate: new Date().getTime()
            }
            filesTab.push(file)
            // console.log(files.upload.path.slice(50))
            readRoot()
            const fullContext = {
                path: fullPathTab,
                foldersTab: foldersTab,
                filesTab: filesTab,
            }
            res.render('FileManager.hbs', fullContext)
        }
    });
});

//tworzenie folderow
app.get("/handleFolder", function (req, res) {
    let zmPom = 0
    let error = 0
    let nazwa = req.query.upload2
    for (i = 0; i < foldersTab.length; i++) {
        if (foldersTab[i].dir == nazwa) {
            error = 1
        }
    }
    if (error == 0) {
        const filepath = readFilepath().toString() + "/" + nazwa
        fs.mkdir(filepath, (err) => {
            for (i = 0; i < foldersTab.length; i++) {
                if (foldersTab[i].dir != nazwa) {
                    zmPom++
                }
            }
            if (zmPom == foldersTab.length) {
                if (err) throw err
                idDir++
            }
        })
        readRoot()
        const fullContext = {
            path: fullPathTab,
            foldersTab: foldersTab,
            filesTab: filesTab,
        }
        // console.log(fullContext)
        res.render('Filemanager.hbs', fullContext);
    }
    else {
        console.log("istnieje juz folder z taka nazwa")
        readRoot()
        const fullContext = {
            path: fullPathTab,
            foldersTab: foldersTab,
            filesTab: filesTab,
        }
        // console.log(fullContext)
        res.render('Filemanager.hbs', fullContext);
    }
})

//otwieranie plikow
app.get("/openFile", function (req, res) {
    let file = req.query.file
    const filepath = readFilepath() + "/" + file
    let text
    let type = file.split(".")
    type = type[1]
    // console.log(filepath)
    // console.log(req.query.file)
    if (type == "txt" || type == "html" || type == "xml" || type == "js" || type == "css" || type == "json") {
        fs.readFile(filepath, (err, data) => {
            if (err) throw err
            text = data.toString();
            console.log(1, text)
            const context = {
                file: file,
                text: text,
            }
            // console.log(2, context)
            res.render("Editor.hbs", context)
        })
    }
    else if (type == "png" || type == "jpg" || type == "jpeg") {
        const filepath = readFilepath() + "/" + file
        let image_path = filepath.slice(49);
        const effects = [
            { name: "grayscale", filepath: image_path },
            { name: "invert", filepath: image_path },
            { name: "sepia", filepath: image_path }
        ]
        const context = {
            file: file,
            effects: effects,
            filepath: image_path
        }
        console.log(image_path)
        res.render("PhotoEditor.hbs", context)
    }
    else {
        //plik inny niz obslugiwane pliki tekstowe
        readRoot()
        const fullContext = {
            path: fullPathTab,
            foldersTab: foldersTab,
            filesTab: filesTab,
        }
        // console.log(fullContext.path)
        res.render('Filemanager.hbs', fullContext);
    }
})

//zapisywanie zmian w plikach
app.get("/saveFile", function (req, res) {
    const filepath = readFilepath() + "/" + req.query.file
    let text = req.query.text
    console.log(filepath)
    fs.writeFile(filepath, text, (err) => {
        if (err) throw err
        console.log("plik zapisany");
        const context = {
            file: req.query.file,
            text: text
        }
        // console.log(2, context)
        res.render("Editor.hbs", context)
    })
})
//tworzenie plikow
app.get("/handleFile", function (req, res) {
    let zmPom = 0
    let nazwa = req.query.upload
    let type = nazwa.split(".")
    type = type[1] //rozszerzenie pliku
    let defaultText
    switch (type) { //tekst w pliku w zaleznosci od rozszerzenia
        case "txt":
            defaultText = "Witamy w edytorze pliku tekstowego txt";
            break;
        case "css":
            defaultText = `body{
    background-color: red;
}`;
            break;
        case "html":
            defaultText = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <h1>Witam w pliku html</h1>
</body>
</html>
            `;
            break;
        case "js":
            defaultText = `let x = "Witam w skrypcie js"
console.log(x)
`;
            break;
        case "json":
            defaultText = `
{
    a:1,
    b:2,
    c:3
}
`;
            break;
        case "xml":
            defaultText = `<?xml version="1.0" encoding="UTF-8" ?>
<note>
    <to>Anna</to>
    <from>Bobs</from>
    <body>mail body</body>
</note>
`;
            break;
        default:
            defaultText = "przykladowy tekst"
    }
    const filepath = readFilepath().toString() + "/" + nazwa
    fs.writeFile(filepath, defaultText, (err) => {
        if (err) throw err
        for (i = 0; i < filesTab.length; i++) {
            if (filesTab[i].plik != nazwa) {
                zmPom++
            }
        }
        if (zmPom == filesTab.length) {
            idFile++
            filesTab.push({ plik: nazwa, id: idFile })
        }
    })
    readRoot()
    const fullContext = {
        path: fullPathTab,
        foldersTab: foldersTab,
        filesTab: filesTab,
    }
    res.render('Filemanager.hbs', fullContext);
})

//usuwanie folderow
let folder
app.get("/deleteFolder", function (req, res) {
    for (let i = 0; i < foldersTab.length; i++) {
        if (foldersTab[i].id == req.query.id) {
            folder = foldersTab[i].dir
            foldersTab.splice(i, 1)
            fs.rm("files/" + folder, { force: true, recursive: true }, (err) => {
                if (err) throw err
                console.log("usunieto folder" + folder);
                readRoot()
            })
            const fullContext = {
                path: fullPathTab,
                foldersTab: foldersTab,
                filesTab: filesTab,
            }
            res.render('Filemanager.hbs', fullContext)
        }
    }
})

//usuwanie plikow
let file
app.get("/deleteFile", function (req, res) {
    for (let i = 0; i < filesTab.length; i++) {
        if (filesTab[i].id == req.query.id) {
            file = filesTab[i].plik
            fs.unlink("files/" + file, (err) => {
                if (err) throw err
                console.log("usunieto plik" + file);
            })
            filesTab.splice(i, 1)
            readRoot()
            const fullContext = {
                path: fullPathTab,
                foldersTab: foldersTab,
                filesTab: filesTab,
            }
            res.render('Filemanager.hbs', fullContext)
        }
    }
})

//zmiana biezacego katalogu
app.get("/changeFolder", function (req, res) {
    root = req.query.root
    rootTab.push(root)
    // console.log(rootTab)
    const filepath = readFilepath()

    foldersTab = []
    filesTab = []

    fs.readdir(filepath, (err, files) => {
        if (err) throw err
        files.forEach((file) => {
            fs.lstat(path.join(filepath, file), (err, stats) => {
                if (stats.isDirectory() == true) {
                    idDir++
                    foldersTab.push({ dir: file, id: idDir })
                }
                else {
                    idFile++
                    filesTab.push({ plik: file, id: idFile })
                }
            })
        })
    })

    pathTab = []
    pathTab.push("home")
    rootTab.forEach(addDir)
    function addDir(item) {
        pathTab.push(item)
    }
    // console.log(pathTab)
    pathlinks = []
    pathTab.forEach(addLink)
    function addLink(item, index) {
        let tab = []
        for (i = 0; i <= index; i++) {
            tab.push(pathTab[i])
        }
        pathlinks.push(tab)
    }
    // console.log(pathTab)
    // console.log("links", pathlinks)
    fullPathTab = []
    pathTab.forEach(fullPath)
    function fullPath(item, index) {
        fullPathTab.push({ name: item, link: pathlinks[index] })
    }
    // console.log(fullPathTab)
    const fullContext = {
        path: fullPathTab,
        foldersTab: foldersTab,
        filesTab: filesTab,
    }
    res.render('Filemanager.hbs', fullContext)
});

app.get("/pathNav", function (req, res) {
    // console.log(req.query.path)
    let result = req.query.path
    result = result.toString();
    let arr = result.split(",");
    arr.shift()
    // console.log(arr)
    rootTab = arr
    readRoot()
    const fullContext = {
        path: fullPathTab,
        foldersTab: foldersTab,
        filesTab: filesTab,
    }
    res.render('Filemanager.hbs', fullContext);
})

//zmiana nazwy biezacego katalogu
app.get("/changeRootName", function (req, res) {
    let nowaNazwa = req.query.upload3
    if (rootTab[0]) {
        const oldfilepath = path.join(__dirname, "files", rootPath)
        rootTab[rootTab.length - 1] = nowaNazwa
        let nowaSciezka = readFilepath()
        const newfilepath = nowaSciezka
        if (!fs.existsSync(newfilepath)) {
            fs.rename(oldfilepath, newfilepath, (err) => {
                if (err) console.log(err)
                else {
                    readRoot()
                    const fullContext = {
                        path: fullPathTab,
                        foldersTab: foldersTab,
                        filesTab: filesTab,
                    }
                    res.render('Filemanager.hbs', fullContext);
                }
            })
        }
        else {
            console.log("wybrana nazwa folderu juz istnieje")
        }
    }
    else {
        rootPath = ""
        console.log("nie mozna zmienic nazwy katalogu domowego")
        readRoot()
        const fullContext = {
            path: fullPathTab,
            foldersTab: foldersTab,
            filesTab: filesTab,
        }
        res.render('Filemanager.hbs', fullContext);
    }
})

app.get("/changeFileName", function (req, res) {
    let nowaNazwa = req.query.newName
    let staraNazwa = req.query.oldName
    let text = req.query.text
    const oldfilepath = readFilepath() + "/" + staraNazwa
    let nowaSciezka = readFilepath() + "/" + nowaNazwa
    const newfilepath = nowaSciezka
    console.log(oldfilepath, newfilepath)
    if (!fs.existsSync(newfilepath)) {
        fs.rename(oldfilepath, newfilepath, (err) => {
            if (err) console.log(err)
            else {
                readRoot()
                const context = {
                    file: nowaNazwa,
                    text: text
                }
                // console.log(2, context)
                res.render("Editor.hbs", context)
            }
        })
    }
    else {
        console.log("wybrana nazwa folderu juz istnieje")
    }
})

let font = 15
let className = "dark"

socketio.on('connection', (client) => {
    console.log("klient się podłączył z id = ", client.id)


    client.on("saveSettings", (data) => {
        font = data.font;
        className = data.className;
        console.log(font, className)
    })

    client.emit("settings", {
        font: font,
        className: className
    })

    client.on("disconnect", (reason) => {
        console.log("klient się rozłącza", reason)
    })
});

app.use(express.static(path.join(__dirname + '/static')));
app.use(express.static(path.join(__dirname + '/files')));

server.listen(PORT, function () {
    console.log("start serwera na porcie " + PORT)
})