#!/bin/bash

# Create the AppIcon directory if it doesn't exist
mkdir -p ios/RNApp/Images.xcassets/AppIcon.appiconset

# Generate the base icon with a gradient background and camera icon
convert -size 1024x1024 \
  -define gradient:direction=east \
  gradient:'#FF4B4B-#FF0000' \
  \( -size 700x700 xc:none -fill white -draw "circle 350,350 350,50" \) -composite \
  \( -size 400x400 xc:none -fill white -draw "circle 200,200 200,50" \) -composite \
  \( -size 200x200 xc:none -fill white -draw "circle 100,100 100,25" \) -composite \
  base_icon.png

# Generate all required sizes for iOS
convert base_icon.png -resize 40x40 ios/RNApp/Images.xcassets/AppIcon.appiconset/Icon-App-20x20@2x.png
convert base_icon.png -resize 60x60 ios/RNApp/Images.xcassets/AppIcon.appiconset/Icon-App-20x20@3x.png
convert base_icon.png -resize 58x58 ios/RNApp/Images.xcassets/AppIcon.appiconset/Icon-App-29x29@2x.png
convert base_icon.png -resize 87x87 ios/RNApp/Images.xcassets/AppIcon.appiconset/Icon-App-29x29@3x.png
convert base_icon.png -resize 80x80 ios/RNApp/Images.xcassets/AppIcon.appiconset/Icon-App-40x40@2x.png
convert base_icon.png -resize 120x120 ios/RNApp/Images.xcassets/AppIcon.appiconset/Icon-App-40x40@3x.png
convert base_icon.png -resize 120x120 ios/RNApp/Images.xcassets/AppIcon.appiconset/Icon-App-60x60@2x.png
convert base_icon.png -resize 180x180 ios/RNApp/Images.xcassets/AppIcon.appiconset/Icon-App-60x60@3x.png
convert base_icon.png -resize 1024x1024 ios/RNApp/Images.xcassets/AppIcon.appiconset/ItunesArtwork@2x.png

# Clean up the base icon
rm base_icon.png

echo "App icons generated successfully!" 