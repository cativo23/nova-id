<template>
  <svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg" :class="svgClass">
    <defs>
      <linearGradient :id="gradientId" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#7aa2f7" stop-opacity="1" />
        <stop offset="100%" stop-color="#bb9af7" stop-opacity="1" />
      </linearGradient>
      <filter :id="filterId">
        <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <g transform="translate(30, 30)">
      <path d="M 0,-18 L 16,-9 L 16,9 L 0,18 L -16,9 L -16,-9 Z" fill="none" :stroke="`url(#${gradientId})`" stroke-width="2" :filter="`url(#${filterId})`" />
      <circle cx="0" cy="0" r="3" fill="#7dcfff" :filter="`url(#${filterId})`" />
    </g>
    <text x="60" y="38" font-family="'Courier New', monospace" font-size="24" font-weight="bold" :fill="`url(#${gradientId})`" :filter="`url(#${filterId})`" letter-spacing="2">NOVA_ID</text>
  </svg>
</template>

<script setup lang="ts">
defineProps({
  svgClass: { type: String, default: 'h-8 w-auto' },
  gradientId: { type: String, default: 'neonGradient-auth' },
  filterId: { type: String, default: 'glow-auth' }
})
</script>
