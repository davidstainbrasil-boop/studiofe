/**
 * Google Slides Importer
 *
 * Fetches and converts Google Slides presentations
 */

import { Logger } from '@lib/logger';

const logger = new Logger('slides-importer');

// =============================================================================
// Types
// =============================================================================

export interface GoogleSlide {
  slideId: string;
  slideNumber: number;
  title: string;
  content: string;
  notes: string;
  thumbnailUrl?: string;
  imageUrls: string[];
  backgroundColor?: string;
}

export interface GooglePresentation {
  id: string;
  title: string;
  slides: GoogleSlide[];
  pageSize: {
    width: number;
    height: number;
  };
  createdTime: string;
  modifiedTime: string;
}

export interface SlideElement {
  objectId: string;
  size?: {
    width: { magnitude: number; unit: string };
    height: { magnitude: number; unit: string };
  };
  transform?: object;
  shape?: {
    shapeType: string;
    text?: {
      textElements: Array<{
        textRun?: { content: string };
        paragraphMarker?: object;
      }>;
    };
  };
  image?: {
    contentUrl: string;
    sourceUrl?: string;
  };
  table?: object;
  line?: object;
}

export interface SlidesAPIPage {
  objectId: string;
  pageElements?: SlideElement[];
  slideProperties?: {
    layoutObjectId: string;
    masterObjectId: string;
    notesPage?: {
      pageElements?: SlideElement[];
    };
  };
  pageProperties?: {
    pageBackgroundFill?: {
      solidFill?: {
        color?: { rgbColor?: { red?: number; green?: number; blue?: number } };
      };
    };
  };
}

// =============================================================================
// Google Slides Importer Class
// =============================================================================

export class GoogleSlidesImporter {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Import a Google Slides presentation
   */
  async importPresentation(presentationId: string): Promise<GooglePresentation> {
    logger.info('Importing Google Slides presentation', { presentationId });

    // Fetch presentation data
    const presentation = await this.fetchPresentation(presentationId);

    // Convert to our format
    const slides = await this.extractSlides(presentation, presentationId);

    return {
      id: presentation.presentationId,
      title: presentation.title || 'Untitled Presentation',
      slides,
      pageSize: {
        width: presentation.pageSize?.width?.magnitude || 9144000,
        height: presentation.pageSize?.height?.magnitude || 5143500,
      },
      createdTime: new Date().toISOString(),
      modifiedTime: new Date().toISOString(),
    };
  }

  /**
   * List presentations from Google Drive
   */
  async listPresentations(options?: {
    pageSize?: number;
    pageToken?: string;
  }): Promise<{
    presentations: Array<{
      id: string;
      name: string;
      thumbnailUrl?: string;
      modifiedTime: string;
    }>;
    nextPageToken?: string;
  }> {
    const { pageSize = 20, pageToken } = options || {};

    const params = new URLSearchParams({
      q: "mimeType='application/vnd.google-apps.presentation'",
      fields: 'files(id,name,thumbnailLink,modifiedTime),nextPageToken',
      pageSize: pageSize.toString(),
      orderBy: 'modifiedTime desc',
    });

    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to list presentations: ${response.status}`);
    }

    const data = await response.json();

    return {
      presentations: (data.files || []).map((file: {
        id: string;
        name: string;
        thumbnailLink?: string;
        modifiedTime: string;
      }) => ({
        id: file.id,
        name: file.name,
        thumbnailUrl: file.thumbnailLink,
        modifiedTime: file.modifiedTime,
      })),
      nextPageToken: data.nextPageToken,
    };
  }

  /**
   * Get slide thumbnail URL
   */
  async getSlideThumbnail(
    presentationId: string,
    slideId: string
  ): Promise<string | null> {
    try {
      const response = await fetch(
        `https://slides.googleapis.com/v1/presentations/${presentationId}/pages/${slideId}/thumbnail`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.contentUrl || null;
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private async fetchPresentation(presentationId: string): Promise<{
    presentationId: string;
    title: string;
    slides: SlidesAPIPage[];
    pageSize?: { width?: { magnitude: number }; height?: { magnitude: number } };
  }> {
    const response = await fetch(
      `https://slides.googleapis.com/v1/presentations/${presentationId}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Failed to fetch presentation: ${response.status}`);
    }

    return response.json();
  }

  private async extractSlides(
    presentation: {
      presentationId: string;
      slides: SlidesAPIPage[];
    },
    presentationId: string
  ): Promise<GoogleSlide[]> {
    const slides: GoogleSlide[] = [];

    for (let i = 0; i < presentation.slides.length; i++) {
      const page = presentation.slides[i];
      const slide = await this.extractSlide(page, i + 1, presentationId);
      slides.push(slide);
    }

    return slides;
  }

  private async extractSlide(
    page: SlidesAPIPage,
    slideNumber: number,
    presentationId: string
  ): Promise<GoogleSlide> {
    const elements = page.pageElements || [];

    // Extract title (usually the first text box)
    let title = '';
    const contentParts: string[] = [];
    const imageUrls: string[] = [];

    for (const element of elements) {
      if (element.shape?.text) {
        const text = this.extractText(element.shape.text.textElements);
        if (!title && text.length < 100) {
          title = text;
        } else if (text) {
          contentParts.push(text);
        }
      }

      if (element.image) {
        const url = element.image.contentUrl || element.image.sourceUrl;
        if (url) {
          imageUrls.push(url);
        }
      }
    }

    // Extract notes
    const notes = this.extractNotes(page.slideProperties?.notesPage);

    // Get thumbnail
    const thumbnailUrl = await this.getSlideThumbnail(presentationId, page.objectId);

    // Extract background color
    const backgroundColor = this.extractBackgroundColor(page.pageProperties);

    return {
      slideId: page.objectId,
      slideNumber,
      title: title || `Slide ${slideNumber}`,
      content: contentParts.join('\n'),
      notes,
      thumbnailUrl: thumbnailUrl || undefined,
      imageUrls,
      backgroundColor,
    };
  }

  private extractText(textElements: Array<{
    textRun?: { content: string };
    paragraphMarker?: object;
  }>): string {
    return textElements
      .filter((el) => el.textRun?.content)
      .map((el) => el.textRun!.content)
      .join('')
      .trim();
  }

  private extractNotes(notesPage?: {
    pageElements?: SlideElement[];
  }): string {
    if (!notesPage?.pageElements) return '';

    const notes: string[] = [];

    for (const element of notesPage.pageElements) {
      if (element.shape?.text) {
        const text = this.extractText(element.shape.text.textElements);
        if (text) {
          notes.push(text);
        }
      }
    }

    return notes.join('\n');
  }

  private extractBackgroundColor(pageProperties?: {
    pageBackgroundFill?: {
      solidFill?: {
        color?: { rgbColor?: { red?: number; green?: number; blue?: number } };
      };
    };
  }): string | undefined {
    const fill = pageProperties?.pageBackgroundFill?.solidFill?.color?.rgbColor;
    if (!fill) return undefined;

    const r = Math.round((fill.red || 0) * 255);
    const g = Math.round((fill.green || 0) * 255);
    const b = Math.round((fill.blue || 0) * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createGoogleSlidesImporter(accessToken: string): GoogleSlidesImporter {
  return new GoogleSlidesImporter(accessToken);
}

export default GoogleSlidesImporter;
