// For more information visit: https://www.youtube.com/watch?v=makaJpLvbow
// This video focuses primarily on specific values of alpha, beta, v and r
// It goes on to show the effects of altering the values of alpha and beta

// Model Parameters
var a=180; a=(a/180)*Math.PI; // Alpha in degrees converted to radians
var b=17; b=(b/180)*Math.PI; // Beta in degrees converted to radians
var v=0.67; // Speed of particles
var r=10; // Radius of neighbourhood. the paper puts this at 5, but I seem to be getting the paper's results with 10.
var density=0.028; // in particles per square simulation units

// Model
var p; // Particles
var pt; // temporary particles for toroidal calculation and edge display
var n; // number of particles. stored here for speed, can also obtain this number by taking the length of p
var ptCopies=8; // if the canvas is small enough and neighborhood radius large enough, one particle might need to be copied into as many as 8 temporary positions
var frame=r; // the distance outside of the edges of the canvas that need to be populated with temporary particles. The width of the toroidal frame
var width; // width of the simulation
var height; // height of the simulation
var modelArea;

// Display Parameters
var skipFrame=true;
var colorRender=1;
var pscale=2.5; // Size/scale of particles. 1 gives a good idea of the underlying model since you can see the size of one simulation unit by looking at the size of the dot.
var t=40; // Time interval in milliseconds

// Display
var canvas, context; // HTML canvas
var scale; // Size/scale of display
var displayWidth;
var displayHeight;
var justDrew=true;

// Device Adjust Parameters
var areaFactor=0.012; // how greatly screen size impacts simulation area
var areaBase=8000;

// RGB Colors
var black='#000000';
var darkred='#591601';
var darkdarkgrey='#101010';
var darkgrey='#202020';
var grey='#808080';
var lightgrey='#C0C0C0';
var white='#FFFFFF';
var green='#00C200';
var yellow='#F8E302';
var orange='#FFA500';
var blue='#0064FF';
var magenta='#FF0792';
var brown='#A4714B';

// Common Static Values
var PI=Math.PI;
var TWO_PI=2*Math.PI;

function run() {
    window.addEventListener('resize', init);
    init();
    run=setInterval(loop,skipFrame?(t/2):t);
}

function init() {
    displayWidth=window.innerWidth;
    displayHeight=window.innerHeight;

    calibrateModelPerDevice();
    initModel();
    initDisplay();
    populateUniformRandom();
    populateFrame();
}

function calibrateModelPerDevice() {
    modelArea=areaBase+(displayWidth*displayHeight*areaFactor);
}

function initModel() {
    height=Math.sqrt((modelArea*displayHeight)/displayWidth);
    width=modelArea/height;
    n=Math.ceil(modelArea*density);
    p=new Array(n);
    pt=new Array(n);
}
 
function initDisplay() {
    canvas=document.getElementById("canvas");
    canvas.width=displayWidth;
    canvas.height=displayHeight;
    context=canvas.getContext("2d");

    scale=displayHeight/height;
}

function populateUniformRandom() {
    for (i=0; i<n; i++) { // Randomize position and orientation of particles:
        p[i]=new Array(5); // Each particle has 5 variables
        p[i][0]=Math.random()*width; // Set random x coordinate
        p[i][1]=Math.random()*height; // Set random y coordinate
        p[i][2]=Math.random()*2*Math.PI; // Set random orientation
      //p[i][3] reserved for keeping track of number of neighbors in update()
        p[i][4]=0; // special render flag

        pt[i]=new Array(ptCopies);
        pt[i].active=false; // default to not in use
        for (j=0; j<ptCopies; j++) { 
            pt[i][j]=new Array(4); // temporary particles just need x, y, number of neighbors and...
            pt[i][j].active=false; // an indicator for whether they are in use or not
        }
    }
    // set first two particles to be specially rendered:
    p[0][4]=1;
    p[1][4]=2;
}

function populateFrame() {
    for (i=0; i<n; i++) { // make temporary positional copy of all particles inside the edges of the canvas mapped to locations in the frame
        placeInFrame(frame, i);
    }
}

function loop() {
    updateParticles(); // perform simulation update

    if (skipFrame) // draw always or every other frame 
        if (justDrew) 
            justDrew=false; 
        else { 
            draw(); 
            justDrew=true;
        }
    else
        draw(); // draw canvas
}

function updateParticles() {
    for (i=0; i<n; i++) { // For each particle:
        // Count neighbors within radius r:
        let count = { l:0, r:0, t:0 }
        for (j=0; j<n; j++) if (i!=j) { // Compare every other particle:
            checkNeighbor(p[i][0], p[i][1], p[j][0], p[j][1], count);
            if (pt[j].active==true) for (k=0; k<ptCopies; k++) { // compare every particle's temporary positions for toroidal topology
                if (pt[j][k].active==true) {
                    checkNeighbor(p[i][0], p[i][1], pt[j][k][0], pt[j][k][1], count);
                }
            }
        }
        count.t=count.l+count.r;

        p[i][3]=count.t; // Used for colouring particles
                
        // delta_phi = alpha + beta × N × sign(R - L)
        let deltaPhi=a+(b*count.t*Math.sign(count.r-count.l));
        
        // turn right delta_phi
        p[i][2]+=deltaPhi;
        p[i][2]=scope(p[i][2]); // Keep angles within scope!
        
        // Move forward v
        p[i][0]+=(v*2*Math.cos(p[i][2])); // X coordinate
        p[i][1]+=(v*2*Math.sin(p[i][2])); // Y coordinate
        
        // using toroidal topology, correct particles that ventured off of the canvas
        if (p[i][0]<0) p[i][0]=width-p[i][0];
        else if (p[i][0]>width) p[i][0]=p[i][0]-width;
        if (p[i][1]<0) p[i][1]=height-p[i][1];
        else if (p[i][1]>height) p[i][1]=p[i][1]-height;

        // then update the temporary particle copies in the frame for this particle
        placeInFrame(frame, i);
    }
}

function checkNeighbor(px, py, nx, ny, count) {
    let sX=nx-px; // X axis separation
    let sY=ny-py; // Y axis separation

    if (sX>=r||sY>=r) return;

    let sD=Math.sqrt((sX*sX)+(sY*sY)); // Separation distance
    if (sD<r) { // Distance is within radius r
        let sA=scope(Math.atan2(sY,sX)); // Separation angle
        if (scope(sA-p[i][2])<PI) count.r++; // Neighbour on right
        else count.l++; // Neighbour on left
    }
}

function scope(ang) { // Ensure angles are between 0 and 2*pi radians!
    while (ang>TWO_PI) ang=ang-TWO_PI;
    while (ang<0) ang=ang+TWO_PI;
    return ang;
}

function placeInFrame(frame, i) {
    /*
    *   temporary particles locations are in the frame around the canvas
    *
    *   * |  *frame  | *
    *   --+----------+--
    *     |  canvas  |       
    *   * |          | *
    *   --+----------+--
    *   * |  *frame  | *
    *
    * 
    *   regions in which a particle may exist within the canvas that will need copying into appropriate regions of the frame
    *   the four regions inside the canvas overlap in the corners
    *
    *   6 |       3       | 7
    *   --+---+-------+---+--
    *     |   |   2   |   |
    *     +---+-------+---+
    *   1 | 0 |       | 1 | 0
    *     +---+-------+---+
    *     |   |   3   |   |
    *   --+---+-------+---+--
    *   5 |       2       | 4
    * 
    */
    var regions=new Array(4);

    var x = p[i][0];
    var y = p[i][1];
    var nhbr = p[i][3];
    var flg = p[i][4];

    regions[0]=(x<frame?true:false);
    regions[1]=(x>width-frame?true:false);
    regions[2]=(y<frame?true:false);
    regions[3]=(y>height-frame?true:false);

    if (regions[0]||regions[1]||regions[2]||regions[3]) { // only calculate temporary particle positions if the particle exists in a region of the canvas
        pt[i].active=true; // set the use flag for the particle to true and continue to calculate mapped points in the frame per region setting use flags along the way
        if (regions[0])             { pt[i][0].active=true; pt[i][0][0]=width+x;    pt[i][0][1]=y;           pt[i][0][3]=nhbr; pt[i][0][4]=flg; } else { pt[i][0].active=false; }
        if (regions[1])             { pt[i][1].active=true; pt[i][1][0]=-(width-x); pt[i][1][1]=y;           pt[i][1][3]=nhbr; pt[i][1][4]=flg; } else { pt[i][1].active=false; }
        if (regions[2])             { pt[i][2].active=true; pt[i][2][0]=x;          pt[i][2][1]=height+y;    pt[i][2][3]=nhbr; pt[i][2][4]=flg; } else { pt[i][2].active=false; }
        if (regions[3])             { pt[i][3].active=true; pt[i][3][0]=x;          pt[i][3][1]=-(height-y); pt[i][3][3]=nhbr; pt[i][3][4]=flg; } else { pt[i][3].active=false; }
        if (regions[0]&&regions[2]) { pt[i][4].active=true; pt[i][4][0]=width+x;    pt[i][4][1]=height+y;    pt[i][4][3]=nhbr; pt[i][4][4]=flg; } else { pt[i][4].active=false; }
        if (regions[2]&&regions[1]) { pt[i][5].active=true; pt[i][5][0]=-(width-x); pt[i][5][1]=height+y;    pt[i][5][3]=nhbr; pt[i][5][4]=flg; } else { pt[i][5].active=false; }
        if (regions[1]&&regions[3]) { pt[i][6].active=true; pt[i][6][0]=-(width-x); pt[i][6][1]=-(height-y); pt[i][6][3]=nhbr; pt[i][6][4]=flg; } else { pt[i][6].active=false; }
        if (regions[3]&&regions[0]) { pt[i][7].active=true; pt[i][7][0]=width+x;    pt[i][7][1]=-(height-y); pt[i][7][3]=nhbr; pt[i][7][4]=flg; } else { pt[i][7].active=false; }
    } else { // not in any region, set flag so that the update function doesn't have to check for temporary particle locations on this particle
        pt[i].active=false;
    }
}

function draw() {
    context.clearRect(0,0,displayWidth,displayHeight); // Clear canvas
    context.fillStyle=darkred;
    context.fillRect(0,0,displayWidth,displayHeight);
    for (i=0; i<n; i++) { // For each particle:
        drawParticle(p[i]);
        if (pt[i].active==true) for (j=0; j<ptCopies; j++) {
            if (pt[i][j].active==true) {
                drawParticle(pt[i][j]);
            }
        }
    }
}

function drawParticle(particle) {
    // Set fill colour based on number of neighbours:
    let fc;
    if (colorRender==0) {
        fc=green;
        if (particle[4]==1) fc=white; // obey render flag above all else
        else if (particle[4]==2) fc=lightgrey;
        else if (particle[3]>35) fc=yellow;
        else if (particle[3]>18) fc=blue;
        else if (particle[3]>15) fc=magenta;
        else if (particle[3]>12) fc=brown;
    } else if (colorRender==1) {
        if (particle[4]==1) fc=white;
        else if (particle[4]==2) fc=lightgrey;
        else {
            let h=(-particle[3]*4.4)+10;
            let l=(particle[3]*1.1)+20;
            fc=`hsl(${h},100%,${l}%)`;
        }
    }
    // Draw particle:
    context.beginPath();
    context.arc(particle[0]*scale,particle[1]*scale,pscale*scale,0,TWO_PI);
    context.fillStyle=fc;
    context.fill();
}
