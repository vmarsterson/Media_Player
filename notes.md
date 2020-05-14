// class AudioGrid {
//     static context = undefined
//     static createContext = () => {
//         this.context = newAudioGrid
//     }
// }

// class Note extends AudioGrid {
//     constructor(freq) {
//         super()

//         if (!this.constructor.context) {
//             this.constructor.createContext()
//         }

//         const note = this.constructor.context.createOscillator()
//         note.frequency.value = freq
//         note.connect(this.constructor.context.destination)
//         note.start()
//         note.stop(this.consturctor,context.currentTime + .250)
//     }
// }


    
    
// .map(row => row[state.bar])
// .filter => cell
// .forEach(freq => new Note(freq))
// return state