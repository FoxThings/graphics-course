#version 450
#extension GL_ARB_separate_shader_objects : enable

layout(location = 0) out vec4 fragColor;

layout(binding = 0) uniform sampler2D iChannel0;
layout(binding = 1) uniform sampler2D iChannel1;
layout(binding = 2, set = 0) uniform params {
  uvec2 iResolution;
  uvec2 iMouse;
  float iTime;
};

#define MAX_STEPS    90
#define MAX_DIST     10.0
#define SHADOW_STEPS 20
#define EPS          0.003

const vec3 eye   = vec3(0, 1, 5);
const vec3 light = vec3(2, 5, 5);

float sphereSDF(vec3 p, vec3 center, float radius) {
    return length(p - center) - radius;
}


float planeSDF(vec3 p) {
    return p.y + EPS;
}

vec3 getMovingSphereCenter() {
    float shpereY = sin(-iTime) * 1.0 + 2.0;

    return vec3(0, shpereY, 0);
}

float scene(vec3 point, out int objectID) {
    float sphereDist = sphereSDF(point, getMovingSphereCenter(), 1.0);
    float planeDist = planeSDF(point);


    if (sphereDist < planeDist) {
        objectID = 1;
        return sphereDist;
    } else {
        objectID = 2;
        return planeDist;
    }
}

vec3 generateNormal(vec3 z, float d) {
    float e = max(d * 0.5, EPS);
    int temp;

    float dx1 = scene(z + vec3(e, 0, 0), temp);
    float dx2 = scene(z - vec3(e, 0, 0), temp);
    float dy1 = scene(z + vec3(0, e, 0), temp);
    float dy2 = scene(z - vec3(0, e, 0), temp);
    float dz1 = scene(z + vec3(0, 0, e), temp);
    float dz2 = scene(z - vec3(0, 0, e), temp);

    return normalize(vec3(dx1 - dx2, dy1 - dy2, dz1 - dz2));
}

vec3 trace(vec3 from, vec3 dir, out bool hit, out int objectID) {
    vec3 p = from;
    float totalDist = 0.0;
    hit = false;

    for (int step = 0; step < MAX_STEPS; ++step) {
        float dist = abs(scene(p, objectID));
        if (dist < EPS) {
            hit = true;
            break;
        }

        totalDist += dist;

        if (totalDist > MAX_DIST)
            break;

        p += dir * dist;
    }

    return p;
}

float softShadow(vec3 from, vec3 dir, float minDist, float maxDist) {
    float shadowFactor = 1.0;
    float totalDist = minDist;

    for (int i = 0; i < SHADOW_STEPS; ++i) {
        int objID;
        float dist = scene(from + dir * (totalDist + EPS), objID);

        if (dist < EPS) {
            return 0.0;
        }

        shadowFactor = min(shadowFactor, dist / totalDist);
        totalDist += dist;

        if (totalDist > maxDist) {
            break;
        }
    }

    return shadowFactor;
}

void mainImage(in vec2 fragCoord, in vec2 iResolution) {
    fragCoord.y = -fragCoord.y;
    iResolution.y = -iResolution.y;

    bool hit;
    int objectID;

    vec2 scale = 8.0 * iResolution.xy / max(iResolution.x, iResolution.y);
    vec2 uv = scale * (fragCoord/iResolution.xy - vec2(0.5));
    vec3 dir = normalize(vec3(uv, 0) - eye);
    vec3 p = trace(eye, dir, hit, objectID);

    vec3 color = vec3(0.1, 0.1, 0.2);

    if (hit) {
        vec3 l   = normalize(light - p);
        vec3 v   = normalize(eye - p);
        vec3 n   = generateNormal(p, EPS);
        float nl = max(0.0, dot(n, l));
        vec3 h   = normalize(l + n);
        float hn = max(0.0, dot(h,n));
        float sp = pow(hn, 100.0);

        float shadow = softShadow(p + n * EPS, l, EPS, 10.0);

        vec3 norm = abs(n);
        norm /= (norm.x + norm.y + norm.z);

        if (objectID == 1) {
            vec3 sphereCenter = getMovingSphereCenter();
            vec3 localPos = p - sphereCenter;

            float u = 0.5 + atan(localPos.z, localPos.x) / (2.0 * 3.14159);
            float v = 0.5 - asin(localPos.y) / 3.14159;

            vec3 SphereAlbedo = texture(iChannel0, vec2(u, v)).rgb;

            color = SphereAlbedo * (0.7 * vec3(nl) + 0.3 * cos(iTime+uv.xyx+vec3(0,2,4)) + sp * vec3(1.0, 1.0, 1.0));
        } else if (objectID == 2) {
            vec3 PlainAlbedo =
                norm.x * texture(iChannel1, p.yz).rgb +
                norm.y * texture(iChannel1, p.xz).rgb +
                norm.z * texture(iChannel1, p.xy).rgb;
            color = PlainAlbedo * (vec3(0.4, 0.5, 0.5) * nl * shadow);
        }
    }

    fragColor = vec4(color, 1.0);
}

void main()
{
  vec2 fragCoord = gl_FragCoord.xy;

  mainImage(fragCoord, iResolution);
}
