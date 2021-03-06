/// Odyssey - A Film Made of Fragment Shaders
/// Author: Weili Shi
/// E-mail: me@shi-weili.com

#ifdef GL_ES
precision mediump float;
#endif

#define AA 0.002    // Anti-aliasing factor
#define PI 3.14159265359

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

uniform sampler2D u_tex0;
uniform vec2 u_tex0Resolution;

uniform sampler2D u_tex1;
uniform vec2 u_tex1Resolution;

float time = u_time + 0.0;

// Global variables for coordinates and color:
vec2 st = vec2(0.0);
vec2 sti = vec2(0.0);
vec2 stf = vec2(0.0);
vec2 drift = vec2(0.0);
float scaleFactor = 1.0;
float rotation = 0.0;
vec3 color = vec3(0.0);

// Global variables for scene mask's coordinates and color:
vec2 mSt = vec2(0.0);
vec2 mSti = vec2(0.0);
vec2 mStf = vec2(0.0);
vec2 mDrift = vec2(0.0);
float mScaleFactor = 1.0;
float mRotation = 0.0;
vec3 mColor = vec3(0.0);
float mPct = 0.0;

vec2 mouse = u_mouse;

///--------------------------------------------------------------------------------
/// Matrix manipulation.
/// shift(), scale() and rotate() are decoupled;
/// They can be called in any sequence without confusing each other.
/// Notice that (0.5, 0.5) is considered as the center of the scene.

mat2 rotateMatrix(float angle) {
    /// Angle in radians.

    return mat2(cos(angle), -sin(angle),
        sin(angle), cos(angle));

}

void shift(inout vec2 st, out vec2 sti, out vec2 stf, out vec2 drift, vec2 v) {
    /// Move the screen position of (0.5, 0.5) with current scaleFactor in mind.
    /// Won't be affected by rotation.

    st += v;

    drift += v;
    sti = floor(st);
    stf = fract(st);

}

void shift(vec2 v) {

    shift(st, sti, stf, drift, v);

}

void shiftMask(vec2 v) {

    shift(mSt, mSti, mStf, mDrift, v);

}

void shift(float x, float y) {

    shift(st, sti, stf, drift, vec2(x, y));

}

void shiftMask(float x, float y) {

    shift(mSt, mSti, mStf, mDrift, vec2(x, y));

}

void scale(inout vec2 st, out vec2 sti, out vec2 stf, out float scaleFactor, float factor) {
    /// Scale about (0.5, 0.5).

    st -= 0.5;
    st *= factor;
    st += 0.5;

    scaleFactor *= factor;

    sti = floor(st);
    stf = fract(st);

}

void scale(float factor) {

    scale(st, sti, stf, scaleFactor, factor);

}

void scaleMask(float factor) {

    scale(mSt, mSti, mStf, mScaleFactor, factor);

}

void rotate(inout vec2 st, out vec2 sti, out vec2 stf, out float rotation, float angle) {
    /// Rotate around (0.5, 0.5).
    /// Angle in radians.

    st -= 0.5;
    st *= rotateMatrix(angle);
    st += 0.5;

    rotation = mod(rotation + angle, 2.0 * PI);
    sti = floor(st);
    stf = fract(st);

}

void rotate(float angle) {

    rotate(st, sti, stf, rotation, angle);

}

void rotateCell(float angle) {
    /// Rotate each cell respectively around their (0.5, 0.5).
    /// Note that this will break the reversibility of matrix manipulation.

    vec2 dumbSti;
    float dumbRotation;

    rotate(stf, dumbSti, stf, dumbRotation, angle);

}

void rotateMask(float angle) {

    rotate(mSt, mSti, mStf, mRotation, angle);

}

void prepareCoordiantes() {
    /// Get the coordinate, make it apsect-ratio free;
    st = gl_FragCoord.xy / u_resolution.xy;
    mSt = gl_FragCoord.xy / u_resolution.xy;
    mouse = u_mouse.xy / u_resolution.xy;

    // Make the scene aspect-ratio free:
    st.x *= u_resolution.x / u_resolution.y;
    mSt.x *= u_resolution.x / u_resolution.y;
    mouse.x *= u_resolution.x / u_resolution.y;

    // Shift (0, 0) to the center of the screen:
    st.x -= 0.5 * u_resolution.x / u_resolution.y;
    st.y -= 0.5;
    mSt.x -= 0.5 * u_resolution.x / u_resolution.y;
    mSt.y -= 0.5;
    mouse.x -= 0.5 * u_resolution.x / u_resolution.y;
    mouse.y -= 0.5;

    // Shift (0.5, 0.5) to the center of the screen:
    st += 0.5;
    mSt += 0.5;
    mouse += 0.5;

    sti = floor(st);
    stf = fract(st);
    mSti = floor(mSt);
    mStf = fract(mSt);

}

///--------------------------------------------------------------------------------
/// Color blending.

vec3 blend(vec3 upperLayer, vec3 downLayer, float opacity) {

    return mix(downLayer, upperLayer, opacity);

}

vec3 mask(vec3 upperLayer, vec3 downLayer, float mask, float opacity) {
    /// mask is usually related to the shape of upperLayer.
    /// opacity is usually a constant.

    return mix(downLayer, upperLayer, mask * opacity);

}

vec3 paste(vec3 upperLayer, vec3 downLayer) {
    /// Only paste non-blank (non-black) part of the upperLayer on top of the downLayer.
    /// Suitable for solid shapes.

    float opacity = (upperLayer.x > 0.0 || upperLayer.y > 0.0 || upperLayer.z > 0.0) ? 1.0 : 0.0;
    return mix(downLayer, upperLayer, opacity);

}

vec3 screen(vec3 upperLayer, vec3 downLayer) {
    /// The screen blend mode results in a brighter picture.

    return vec3(1.0) - (vec3(1.0) - downLayer) * (vec3(1.0) - upperLayer);

}

vec3 rgb(int r, int g, int b) {
    /// Return a vector float representation of the integer RGB color.

    return vec3(float(r), float(g), float(b)) / 255.0;

}

vec3 rgb(float r, float g, float b) {
    /// Return a vector representation of the RGB color.

    return vec3(r, g, b);

}

vec3 tint(vec3 shape, vec3 color) {
    /// Tint white shape with color.
    /// Suitable for solid shapes.

    return shape * color;

}

vec3 tint(float shape, vec3 color) {

    return vec3(shape) * color;

}

vec3 blackScene() {

    return vec3(0.0);

}

///--------------------------------------------------------------------------------
/// Basic shapes.
/// All shapes are white, on a black background.

float circle(vec2 st, vec2 center, float radius) {

    float d = distance(st, center);

    return 1.0 - smoothstep(radius - AA,
       radius + AA,
       d);

}

float circle(vec2 st, float radius) {
    /// Centered at (0.5, 0.5).

    return circle(st, vec2(0.5), radius);

}

float gCircle(vec2 st, vec2 center, float startDistance, float endDistance) {
    /// Circular graident.

    float d = distance(st, center);

    return smoothstep(endDistance, startDistance, d);

}

float gCircle(vec2 st, float startDistance, float endDistance) {
    /// Centered at (0.5, 0.5).

    return gCircle(st, vec2(0.5), startDistance, endDistance);

}

float quadrant(vec2 st, float radius, int position) {
    /// Position 0: bottom-left
    /// Position 1: top-left
    /// Position 2: top-right
    /// Position 3: bottom-right

    float d;

    if(position == 0) {
        d = distance(st, vec2(0.0, 0.0));
        } else if(position == 1) {
            d = distance(st, vec2(0.0, 1.0));
            } else if(position == 2) {
                d = distance(st, vec2(1.0, 1.0));
                } else {
                    d = distance(st, vec2(1.0, 0.0));
                }

                return 1.0 - smoothstep(radius - AA,
                   radius + AA,
                   d);
            }

            float irTriangle(vec2 st, int position) {
    /// Isosceles right triangle
    /// Position 0: bottom-left
    /// Position 1: top-left
    /// Position 2: top-right
    /// Position 3: bottom-right

    float difference;

    if(position == 0) {
        difference = (1.0 - st.x) - st.y;
        } else if(position == 1) {
            difference = st.y - st.x;
            } else if(position == 2) {
                difference = st.y - (1.0 - st.x);
                } else {
                    difference = st.x - st.y;
                }

                return smoothstep(-0.01, 0.01, difference);

            }

            float box(vec2 st, float size) {

                float edge = (1.0 - size) / 2.0;

                return smoothstep(0.0 + edge - AA, 0.0 + edge + AA, st.x) *
                smoothstep(0.0 + edge - AA, 0.0 + edge + AA, st.y) *
                (1.0 - smoothstep(1.0 - edge - AA, 1.0 - edge + AA, st.x)) *
                (1.0 - smoothstep(1.0 - edge - AA, 1.0 - edge + AA, st.y));
            }

            float halfSquare(vec2 st, int position) {
    /// Position 0: left
    /// Position 1: right
    /// Position 2: top
    /// Position 3: bottom

    if(position == 0) {
        return smoothstep(0.5 - AA, 0.5 + AA, 1.0 - st.x);
        } else if(position == 1) {
            return smoothstep(0.5 - AA, 0.5 + AA, st.x);
            } else if(position == 2) {
                return smoothstep(0.5 - AA, 0.5 + AA, st.y);
                } else {
                    return smoothstep(0.5 - AA, 0.5 + AA, 1.0 - st.x);
                }

            }

            float polygon(vec2 st, float radius, int n) {
    /// N-sided regular polygon, with the bottom edge horizontal.
    /// n should be no less than 3.

    float nf = float(n);

    st -= vec2(0.5);
    float theta = atan(st.y, st.x) + (PI / 2.0);

    float edge = radius * (cos(PI / nf) / cos(theta - (2.0 * PI / nf) * floor((nf * theta + PI) / (2.0 * PI))));

    return 1.0 - smoothstep(edge - AA,
        edge + AA,
        length(st));

}

float box(vec2 st, float sizeX, float sizeY) {

    st -= 0.5;

    return smoothstep(-sizeX / 2.0 - AA, -sizeX / 2.0 + AA, st.x) * (1.0 - smoothstep(sizeX / 2.0 -  AA, sizeX / 2.0 + AA, st.x))
            * smoothstep(-sizeY / 2.0 - AA, -sizeY / 2.0 + AA, st.y) * (1.0 - smoothstep(sizeY / 2.0 - AA, sizeY / 2.0 + AA, st.y));
}

float cross(vec2 st, float size){

    return  min(box(st, size, size / 4.0) + box(st, size / 4.0, size), 1.0);

}

///--------------------------------------------------------------------------------
/// Utility functions.

float random(vec2 st) {

    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);

}

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

/// GLSL 2D simplex noise function
///      Author : Ian McEwan, Ashima Arts
///  Maintainer : ijm
///     Lastmod : 20110822 (ijm)
///     License : 
///  Copyright (C) 2011 Ashima Arts. All rights reserved.
///  Distributed under the MIT License. See LICENSE file.
///  https://github.com/ashima/webgl-noise

/// Notice that snoise ranges from -1.0 to 1.0!

float snoise(vec2 v) {

    // Precompute values for skewed triangular grid
    const vec4 C = vec4(0.211324865405187,
                        // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  
                        // 0.5*(sqrt(3.0)-1.0)
                        -0.577350269189626,  
                        // -1.0 + 2.0 * C.x
                        0.024390243902439); 
                        // 1.0 / 41.0

    // First corner (x0)
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);

    // Other two corners (x1, x2)
    vec2 i1 = vec2(0.0);
    i1 = (x0.x > x0.y)? vec2(1.0, 0.0):vec2(0.0, 1.0);
    vec2 x1 = x0.xy + C.xx - i1;
    vec2 x2 = x0.xy + C.zz;

    // Do some permutations to avoid
    // truncation effects in permutation
    i = mod289(i);
    vec3 p = permute(
        permute( i.y + vec3(0.0, i1.y, 1.0))
        + i.x + vec3(0.0, i1.x, 1.0 ));

    vec3 m = max(0.5 - vec3(
        dot(x0,x0), 
        dot(x1,x1), 
        dot(x2,x2)
        ), 0.0);

    m = m*m ;
    m = m*m ;

    // Gradients: 
    //  41 pts uniformly over a line, mapped onto a diamond
    //  The ring size 17*17 = 289 is close to a multiple 
    //      of 41 (41*7 = 287)

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    // Normalise gradients implicitly by scaling m
    // Approximation of: m *= inversesqrt(a0*a0 + h*h);
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0+h*h);

    // Compute final noise value at P
    vec3 g = vec3(0.0);
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * vec2(x1.x,x2.x) + h.yz * vec2(x1.y,x2.y);
    return 130.0 * dot(m, g);
}

float snoise01(vec2 v) {
    /// Ranges from 0.0 to 1.0.

    return snoise(v) * 0.5 + 0.5;

}

///--------------------------------------------------------------------------------

vec4 blur(vec2 st, sampler2D texture, float granularity, float radius) {

    vec4 color = texture2D(texture, st);
    int count = 1;

    for(float shift = granularity; shift < radius; shift += granularity) {

        for(int i = 0; i < 3; i ++) {

            for(int j = 0; j < 3; j++) {

                if(!(i == 0 && j == 0)) {

                    color += texture2D(texture, st + vec2(-shift + float(i) * shift, -shift + float(i) * shift));
                    count ++;

                }

            }

        }

    }

    color /= float(count);

    return color;

}

void main() {

    prepareCoordiantes();

    /// Now the center of the scene is the same as that of the window,
    /// and the scene will scale/duplicate about its center.
    /// The coordinate of the center of the window/main scene is (0.5, 0.5).
    /// When drawing using stf, the scence ranges from (0.0, 0.0) to (1.0, 1.0).

    vec2 mouseDrift = mouse - vec2(0.5, 0.5);
    float mouseDriftLength = clamp(length(mouseDrift), 0.0, 0.5);
    float driftAngle = -(atan(mouseDrift.y, mouseDrift.x) + PI * 0.5);
    float telescopeShiftLength = pow(mouseDriftLength * 2.0, 2.0) * 0.12;
    vec2 telescopeShift = vec2(sin(driftAngle), cos(driftAngle)) * telescopeShiftLength;

    vec4 telescopicSight = vec4(1.0);
    telescopicSight.b = texture2D(u_tex0, st).b;
    telescopicSight.g = texture2D(u_tex0, st + telescopeShift * 0.5).g;
    telescopicSight.r = texture2D(u_tex0, st + telescopeShift).r;

    float blurRadius = smoothstep(0.0, 0.707, distance(mouse, vec2(0.5, 0.5))) * 0.01;
    vec4 background = vec4(1.0);
    // background.b = texture2D(u_tex1, st).b;
    // background.g = texture2D(u_tex1, st - telescopeShift * 0.15).g;
    // background.r = texture2D(u_tex1, st - telescopeShift * 0.30).r;
    background.b = blur(st, u_tex1, 0.001, blurRadius).b;
    background.g = blur(st - telescopeShift * 0.20, u_tex1, 0.001, blurRadius).g;
    background.r = blur(st - telescopeShift * 0.40, u_tex1, 0.001, blurRadius).r;

    float circularMask = 1.0 - circle(st, 0.48);
    background -= vec4(circularMask);

    if(sti == vec2(0.0, 0.0)) {

        gl_FragColor = background + telescopicSight;

    } else {

        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);

    }

}