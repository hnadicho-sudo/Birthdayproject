(() => {
	// Elements
	const particles = document.getElementById('particles');
	const canvas = particles;
	const ctx = canvas.getContext('2d');
	const confettiCanvas = document.getElementById('confettiCanvas');
	const confettiCtx = confettiCanvas ? confettiCanvas.getContext('2d') : null;
	const card = document.getElementById('card');
	const openBtn = document.getElementById('openCard');
	const muteBtn = document.getElementById('muteBtn');

	// WebAudio piano
	let audioCtx = null;
	let pianoGain = null;
	let pianoVolume = 0.18;
	let pianoLoopId = null;


	// Resize canvases
	function resize() {
		canvas.width = innerWidth; canvas.height = innerHeight;
		if(confettiCanvas){ confettiCanvas.width = 320; confettiCanvas.height = 220; }
	}
	addEventListener('resize', resize);
	resize();

	// Particles (sparkling gold)
	const sparks = [];
	function spawnSpark(){
		sparks.push({x:Math.random()*canvas.width,y:Math.random()*canvas.height, vx:(Math.random()-0.5)*0.2, vy:(Math.random()-0.5)*0.2, r:Math.random()*1.8+0.6, life:Math.random()*200+80});
	}
	for(let i=0;i<120;i++)spawnSpark();
	function drawSparks(){
		ctx.clearRect(0,0,canvas.width,canvas.height);
		for(let i=sparks.length-1;i>=0;i--){
			const s=sparks[i];
			s.x+=s.vx; s.y+=s.vy; s.life--;
			ctx.beginPath(); ctx.fillStyle='rgba(212,175,55,'+(0.7*Math.min(1,s.life/150))+')'; ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
			if(s.life<=0){sparks.splice(i,1); if(Math.random()<0.8)spawnSpark();}
		}
	}

	// Floating hearts
	function floatHeart(){
		const el = document.createElement('div'); el.className='floating-heart'; el.textContent='❤';
		el.style.left = Math.random()*100+'%'; el.style.top = (60+Math.random()*30)+'%';
		document.body.appendChild(el);
		const dur = 7000 + Math.random()*4000;
		el.animate([{transform:'translateY(0) scale(0.8)',opacity:1},{transform:'translateY(-260px) scale(1.1)',opacity:0}],{duration:dur,iterations:1,easing:'linear'}).onfinish = ()=>el.remove();
	}
	setInterval(floatHeart,1200);

	// Animation loop
	function loop(){ drawSparks(); requestAnimationFrame(loop); }
	loop();

	// Card open + confetti
	function launchConfetti(){
		if(!confettiCtx) return;
		const pieces = [];
		for(let i=0;i<120;i++){
			pieces.push({x:confettiCanvas.width/2,y:confettiCanvas.height/2,vx:(Math.random()-0.5)*8,vy:(Math.random()-6)*6, r:Math.random()*6+2, c:['#d4af37','#ff6b9a','#ffd166'][Math.floor(Math.random()*3)], life:120});
		}
		let t=0;
		function frame(){
			confettiCtx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
			for(const p of pieces){ p.x+=p.vx; p.y+=p.vy; p.vy+=0.25; p.life--; confettiCtx.fillStyle=p.c; confettiCtx.fillRect(p.x,p.y,p.r, p.r*0.6); }
			t++; if(t<220) requestAnimationFrame(frame); else confettiCtx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
		}
		frame();
	}

	if(openBtn){
		openBtn.addEventListener('click', ()=>{
			card.classList.toggle('open');
			if(card.classList.contains('open')){ launchConfetti(); try{ if(pianoGain) pianoGain.gain.value = pianoVolume; if(muteBtn) muteBtn.textContent='Mute'; }catch(e){} }
		});
	}

	// Music control
	// Piano mute/unmute
	function initPiano(){
		if(audioCtx) return;
		audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		pianoGain = audioCtx.createGain(); pianoGain.gain.value = pianoVolume; pianoGain.connect(audioCtx.destination);
	}

	function playTone(freq, when, duration){
		if(!audioCtx) initPiano();
		const g = audioCtx.createGain(); g.gain.setValueAtTime(0.0001, when);
		g.gain.exponentialRampToValueAtTime(1.0, when + 0.01);
		g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
		g.connect(pianoGain);

		const osc1 = audioCtx.createOscillator(); osc1.type = 'sine'; osc1.frequency.value = freq;
		const osc2 = audioCtx.createOscillator(); osc2.type = 'triangle'; osc2.frequency.value = freq * 2;
		osc1.connect(g); osc2.connect(g);
		osc1.start(when); osc2.start(when);
		osc1.stop(when + duration + 0.02); osc2.stop(when + duration + 0.02);
	}

	function noteToFreq(note){
		// note like C4, D#5, A4
		const match = note.match(/^([A-G])(#|b)?(\d+)$/);
		if(!match) return 440;
		const [,letter,acc,oct] = match;
		const map = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
		let sem = map[letter];
		if(acc === '#') sem += 1; if(acc === 'b') sem -= 1;
		const octave = parseInt(oct,10);
		const midi = (octave + 1) * 12 + (sem % 12 + 12) % 12;
		return 440 * Math.pow(2, (midi - 69) / 12);
	}

	function startPianoLoop(){
		if(pianoLoopId) return;
		initPiano();
		// Happy Birthday melody in G major
		const melody = [
			['G4',0.5],['G4',0.5],['A4',1],['G4',1],['C5',1],['B4',2],
			['G4',0.5],['G4',0.5],['A4',1],['G4',1],['D5',1],['C5',2],
			['G4',0.5],['G4',0.5],['G5',1],['E5',1],['C5',1],['B4',1],['A4',2],
			['F#5',0.5],['F#5',0.5],['E5',1],['C5',1],['D5',1],['C5',2]
		];
		let total = 0;
		const now = audioCtx.currentTime + 0.05;
		for(const [note,dur] of melody){
			const freq = noteToFreq(note);
			playTone(freq, now + total, Math.max(0.12, dur * 0.9));
			total += dur;
		}
		// repeat after melody length + small pause
		pianoLoopId = setTimeout(()=>{ pianoLoopId = null; try{ if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); startPianoLoop(); }catch(e){} }, (total + 2) * 1000);
	}

	function stopPianoLoop(){ if(pianoLoopId){ clearInterval(pianoLoopId); pianoLoopId = null; } }

	if(muteBtn){
		muteBtn.addEventListener('click', ()=>{
			if(!pianoGain){ initPiano(); startPianoLoop(); }
			if(pianoGain.gain.value > 0.001){ pianoGain.gain.value = 0; muteBtn.textContent = 'Unmute'; }
			else{ pianoGain.gain.value = pianoVolume; muteBtn.textContent = 'Mute'; }
		});
	}

	// Gallery slider
	const slides = document.querySelector('.slides');
	const prev = document.querySelector('.prev');
	const next = document.querySelector('.next');
	let idx=0;
	function updateGallery(){ if(!slides) return; const w = slides.querySelector('img').clientWidth + parseInt(getComputedStyle(slides).gap || 16); slides.scrollTo({left: idx * w, behavior:'smooth'}); }
	if(prev) prev.addEventListener('click', ()=>{ idx=Math.max(0,idx-1); updateGallery(); });
	if(next) next.addEventListener('click', ()=>{ idx=Math.min((slides?slides.querySelectorAll('img').length:1)-1,idx+1); updateGallery(); });

	// Countdown / time together (elapsed)
	const timer = document.getElementById('timer');
	// Edit this date to the day your relationship started: (YYYY, M-1, D)
	const started = new Date(2018,5,15,0,0,0); // example: 15 June 2018
	function updateTimer(){
		const now = new Date(); let diff = Math.floor((now - started)/1000);
		const years = Math.floor(diff/(3600*24*365)); diff -= years*3600*24*365;
		const days = Math.floor(diff/(3600*24)); diff -= days*3600*24;
		const hrs = Math.floor(diff/3600); diff -= hrs*3600;
		const mins = Math.floor(diff/60); const secs = diff - mins*60;
		if(timer) timer.textContent = `${years}y ${days}d ${hrs}h ${String(mins).padStart(2,'0')}m ${String(secs).padStart(2,'0')}s`;
	}
	setInterval(updateTimer,1000); updateTimer();

	// Allow first user gesture to resume WebAudio if needed and start piano
	document.addEventListener('click', ()=>{ try{ if(audioCtx && audioCtx.state==='suspended') audioCtx.resume(); startPianoLoop(); }catch(e){} }, {once:true});

})();
