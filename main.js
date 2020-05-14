const state = {
    grid: [
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null]
    ],
    worker: null,
    bar: 0,
    modal: false,
    playedBars: [],
    tracks: JSON.parse(localStorage.getItem('tracks') || "[]"),
    // tracks: [],
    queued_track: undefined,
    // queued_track: [],
    canvas: undefined,
    animation: undefined,
    city: "",
    countryCode: ""
}

Array.prototype.uniq = function () {
    return Array.from(new Set(this))
}

const AudioGrid = {}
AudioGrid.prototype = {
    context: undefined, 
    analyser: undefined,
    audioArray: [],
    createContext: function () {
        AudioGrid.prototype.context = new AudioContext()
        AudioGrid.prototype.analyser = AudioGrid.prototype.context.createAnalyser()
        AudioGrid.prototype.audioArray = new Uint8Array(AudioGrid.prototype.analyser.frequencyBinCount)
        // AudioGrid.prototype.analyser.connect(AudioGrid.prototype.context.destination)
    }
}

const ws = new WebSocket('ws://fathomless-reaches-81353.herokuapp.com/socket')

ws.onmessage = (msg) => {
    if (msg.data === "collect") {
        ws.send(localStorage.getItem('tracks') || "[]")
    } else {
        app.run('ontracks', msg.data)
    }
}

ws.onclose = function () {
 console.log('web socket closed')
}

function Note (freq) {
    if (!this.context) this.createContext()
    const o = this.context.createOscillator()
    o.frequency.value = freq
    o.connect(this.analyser)
    this.analyser.connect(this.context.destination)
    o.start()
    o.stop(this.context.currentTime + .250)
}

Note.prototype = Object.create(AudioGrid.prototype)

const availableFreq = [
    [1047.0, 1175, 1319, 1397, 1480, 1568, 1760, 1976],
    [523.3, 587.3, 659.3, 698.5, 740, 784, 880, 987.8],
    [261.6, 293.7, 329.6, 349.2, 370, 392, 440, 493.9],
    [130.8, 146.8, 164.8, 174.6, 185, 196, 220, 246.9]
    ]
    
const draw = () => {
    state.animation = requestAnimationFrame(draw)
    AudioGrid.prototype.analyser.getByteFrequencyData(AudioGrid.prototype.audioArray)
    const [c, w, h] = state.canvas
    const barWidth = w/ 64
    c.clearRect(0,0,w,h)

    AudioGrid.prototype.audioArray.reduce((x, freq) => {
        c.fillRect(x, h - freq, barWidth, freq)
        return x + barWidth + 2
    }, 0)
}

if ('geolocation' in navigator) {
    const gotLocation = (position) => app.run('setGeolocation', position)
    const failedLocation = (err) => console.error(err)
    navigator.geolocation.getCurrentPosition(gotLocation, failedLocation)
}

const update = {
    toggle: function (state, rowIndex, cellIndex) {
        state.grid[rowIndex][cellIndex] = 
        state.grid[rowIndex][cellIndex] === availableFreq[rowIndex][cellIndex] ? null : availableFreq[rowIndex][cellIndex]
        return state
    },
    play: function(state) {
        state.playedBars = []
        state.worker = new Worker('/worker.js')
        state.worker.onmessage = function (msg) {
            app.run(msg.data)
        }

        if (!AudioGrid.prototype.context) {
            AudioGrid.prototype.createContext()
        }

        if (!state.canvas) {
            const canvas = document.getElementById('canvas')
            canvas.setAttribute('width', window.innerWidth - 33)
            canvas.setAttribute('height', 300)
            state.canvas = [canvas.getContext('2d'), Number(canvas.getAttribute('width')), Number(canvas.getAttribute('height'))]
        state.canvas[0].fillStyle = "white"
        }
        state.animation = requestAnimationFrame(draw)
        return state
    },
    tick: function (state) {
        state.bar = state.bar === 7 ? 0 : state.bar + 1
        state.grid
            .map(row => row[state.bar])
            .filter(cell => cell)
            .forEach(freq => {new Note(freq)
        })
        // if (state.queued_track && state.queued_track.length && state.bar === 0) {
        //     state.grid = state.queued_track.shift()
        // }
        // else {
        // state.playedBars.push(state.grid
        //     .map(row => row[state.bar]))
        // }
        if (Array.isArray(state.queued_track)) {
            if (state.bar === 0) {
                const nextGrid = state.queued_track.shift()
                if (!nextGrid) {
                    state.worker.terminate()
                    state.worker = null
                    state.grid = [
                        [null, null, null, null, null, null, null, null],
                        [null, null, null, null, null, null, null, null],
                        [null, null, null, null, null, null, null, null],
                        [null, null, null, null, null, null, null, null]
                    ]
                    state.bar = 0
                    state.queued_track = undefined
                    const [c, w, h] = state.canvas
                    c.clearRect(0,0,w,h)
                    cancelAnimationFrame(state.animation)
                } else {
                    state.grid = nextGrid
                }
            }
        } else {
            state.playedBars.push(state.grid.map(row => row[state.bar]))
        }
        return state
    },
    // With `map` you take each item, transform it and then return an array of the same size (changing each value in the array before returning)
    // Filter will only return values that are truthy - if a value is false it will reject it and filter it out
    stop: function (state) {
        state.worker.terminate()
        state.worker = null
        state.modal=!state.modal
        state.modal= true
        state.grid = [
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null]
        ]
        state.bar = 0
        const [c, w, h] = state.canvas
        c.clearRect(0,0,w,h)
        cancelAnimationFrame(state.animation)
        return state
    },
    dismissModal: (state, event) => {
        state.modal = false
        // state.modal = event.target.id !== 'modal'
        return state
    },
    reset: (state) => {
    state.modal = false
    return state
},
    save: (state, form) => {
        state.modal = false
        const formData = new FormData(form)
        const track = {
            trackname: formData.get('trackname'),
            artist: "Verity",
            data: state.playedBars,
            city: "",
            countryCode: ""
        }
        state.tracks.push(track)
        localStorage.setItem('tracks', JSON.stringify(state.tracks)) 
        // state.grid = [
        //     [null, null, null, null, null, null, null, null],
        //     [null, null, null, null, null, null, null, null],
        //     [null, null, null, null, null, null, null, null],
        //     [null, null, null, null, null, null, null, null]
        // ]
        return state 
    },
    loadtrack: function(state, trackindex){
        const track = state.tracks[trackindex].data //48
        let slice = 0
        const chunked = []
        while(slice < track.length) {
            chunked.push(track.slice(slice, (slice +=8)))
        }
        while(chunked[chunked.length -1].length < 8) {
            chunked[chunked.length - 1].push([null, null, null, null])
        }

        state.queued_track = chunked.map(chunk => {
            return [
                [chunk[0][0], chunk[1][0], chunk[2][0], chunk[3][0], chunk[4][0], chunk[5][0], chunk[6][0], chunk[7][0]],
                [chunk[0][1], chunk[1][1], chunk[2][1], chunk[3][1], chunk[4][1], chunk[5][1], chunk[6][1], chunk[7][1]],
                [chunk[0][2], chunk[1][2], chunk[2][2], chunk[3][2], chunk[4][2], chunk[5][2], chunk[6][2], chunk[7][2]],
                [chunk[0][3], chunk[1][3], chunk[2][3], chunk[3][3], chunk[4][3], chunk[5][3], chunk[6][3], chunk[7][3]],
            ]
        })
        state.grid = state.queued_track.shift()
        return state
    },
    ontracks: function(state, tracks){
        let newTracks
    try {
        newTracks = JSON.parse(tracks)
        if (!newTracks[0] || !newTracks[0].trackname) throw new Error('wrong format')
            state.tracks = newTracks.map(JSON.stringify).uniq().map(JSON.parse)
    } catch(err) {
        console.log(err)
    } finally {
    state.tracks = newTracks
    return state
    }
    },
    setGeolocation: (state, position) => {
        const {latitude, longitude} = position.coords
        const request = new XMLHttpRequest()
        request.addEventListener('load', function () {
            const city = this.responseXML.getElementsByTagName('city')
            const country_code = this.responseXML.getElementsByTagName('country_code')
            state.city = city[0].textContent
            state.countryCode = country_code[0].textContent
            console.log(state.countryCode)
        })
        request.open('GET', `https://eu1.locationiq.com/v1/reverse.php?key=${"pk.3b33a19debbec45ec842b890890c7a6e"}&lat=${latitude}&lon=${longitude}&format=XML`)
        request.send()
    }
}

const viewHeader = 
`<header>
    <h1> Create. Play. Explore. </h1>
    <h2> Discover music at it's best when you create your own tracks </h2> 
</header>`

const rendered = state => {
    state.canvas = document.getElementById('canvas')
}

const viewMain = state => `
<main>
    <section class="grid">
            ${state.grid.map((row, rowIndex) => {
                return row.map((cell, cellIndex) => {
                    return `<article onclick="app.run('toggle', ${rowIndex}, ${cellIndex})" 
                    class="${cell ? 'on' : 'off'} 
                    ${cellIndex === state.bar ? 'playing' : ''}">
                    <img src="src/treble-clef.png" alt="$">
        </article>`
                }).join('')
            }).join('')}
    </section>
    <section class="button-pair">
            <button onclick="app.run('play');">Play</button>
            <button onclick="app.run('stop');">Stop</button>
    </section>
    <section class="trackbox">
        <ul>${state.tracks.map((track, trackindex) => {
                return `<img src="https://www.countryflags.io/${state.countryCode}/flat/64.png">
                <li onclick="app.run('loadtrack', ${trackindex})" class="tracks">${track.trackname}</li>`
            }).join("")}
        </ul>
    </section>
</main>
`

const modal = state => `
<modal id="modal">
    <form onsubmit="app.run('save', this); return false;">
    <label> Track Name </label>
        <input id="trackname" name="trackname" pattern="[a-zA-Z0-9_\s]+" title="no special characters" required />
        <button type="submit">Save</button>
        <button type="reset" onclick="app.run('dismissModal')">Don't Save</button>
    </form>
</modal>`

const view = (state) => `${viewHeader}${viewMain(state)}${state.modal ? modal(state) : ""}`

// const view = (state) => `${viewHeader}${viewMain(state)}${state.modal ? modal(state) : ""}${tracks(state)}`

// = state => viewMain(state) + (state.modal ? modal(state) : "")
window.app.start(document.getElementById('app'), state, view, update)