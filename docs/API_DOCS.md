# Syntra API Documentation

This document outlines the available API endpoints in the Syntra backend.

## 1. Digital Twin API
**Endpoint:** `/api/twin`
**Methods:** `GET`, `POST` (depending on implementation)
**Description:** Retrieves or updates the user's digital twin data, including scores (Health, Finance, Career) and current streak.

## 2. Event Logging API
**Endpoint:** `/api/log`
**Methods:** `POST`
**Description:** Logs user events and activity to maintain streaks and update domain scores.
**Body:**
```json
{
  "domain": "health | finance | career",
  "event": "Description of the event"
}
```

## 3. CSV Upload API
**Endpoint:** `/api/upload/csv`
**Methods:** `POST`
**Description:** Allows users to upload bulk data via CSV for a specific domain. The data is parsed, encrypted, and saved to the user's logs.
**Form Data Parameters:**
- `file`: The CSV file to upload.
- `domain`: The target domain (`health`, `finance`, or `career`).

**Response:**
```json
{
  "success": true,
  "message": "Successfully parsed and encrypted X records from filename.csv"
}
```

## 4. AI Recommendation API
**Endpoint:** `/api/ai/recommend`
**Methods:** `GET`
**Description:** Generates cross-domain insights, recommendations, and SMART goals based on the user's current Digital Twin metrics (Health, Finance, Career scores, and streak) using Gemini AI.
**Response:**
```json
{
  "success": true,
  "ai": {
    "insights": ["string"],
    "recommendations": ["string"],
    "futureProjection": {
      "health": "string",
      "finance": "string",
      "career": "string"
    },
    "smartGoals": ["string"],
    "confidence": 0.95
  }
}
```
