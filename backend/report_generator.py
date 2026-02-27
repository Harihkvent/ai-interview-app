from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from io import BytesIO
from datetime import datetime
from models import InterviewSession, Resume, InterviewRound, Question, Answer
from avatar_interview_models import AvatarInterviewSession, AvatarQuestion, AvatarResponse
from question_service import generate_report_content_with_krutrim
import json

def format_time_display(seconds: int) -> str:
    """Format time in readable format (MM:SS or HH:MM:SS)"""
    if seconds < 3600:
        minutes = seconds // 60
        secs = seconds % 60
        return f"{minutes:02d}:{secs:02d}"
    else:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"

import logging
logger = logging.getLogger("report_generator")

def calculate_overall_score(session_data: dict) -> float:
    """Calculate final interview score"""
    total_score = 0
    total_questions = 0
    
    rounds = session_data.get('rounds', [])
    if not rounds:
        logger.warning(f"No rounds found in session data for score calculation")
        return 0.0
        
    for round_data in rounds:
        qas = round_data.get('questions_answers', [])
        if not qas:
            logger.debug(f"Round {round_data.get('round_type')} has no question_answers")
            continue
            
        for qa in qas:
            score = qa.get('score', 0)
            total_score += score
            total_questions += 1
            logger.debug(f"Adding score {score} from question. Total questions: {total_questions}")
    
    if total_questions == 0:
        logger.warning(f"Total questions is 0 for session, returning 0.0 score")
        return 0.0
    
    final_score = total_score / total_questions
    logger.info(f"Calculated overall score: {final_score:.2f} ({total_score}/{total_questions})")
    return final_score

async def generate_final_report_data(session_id: str) -> dict:
    """Compile all interview data for report generation"""
    # Get session
    session = await InterviewSession.get(session_id)
    if not session:
        raise ValueError("Session not found")
    
    # Get resume
    resume = None
    if session.resume_id:
        resume = await Resume.get(session.resume_id)
    
    # Get all rounds
    rounds = await InterviewRound.find(InterviewRound.session_id == session_id).to_list()
    
    rounds_data = []
    for round_obj in rounds:
        # Get questions for this round
        questions = await Question.find(Question.round_id == str(round_obj.id)).to_list()
        
        questions_answers = []
        for question in questions:
            # Get answer for this question
            answer = await Answer.find_one(Answer.question_id == str(question.id))
            
            if answer:
                questions_answers.append({
                    'question': question.question_text,
                    'answer': answer.answer_text,
                    'evaluation': answer.evaluation,
                    'score': answer.score,
                    'time_taken': format_time_display(answer.time_taken_seconds)
                })
        
        rounds_data.append({
            'round_type': round_obj.round_type.capitalize(),
            'status': round_obj.status,
            'total_time': format_time_display(round_obj.total_time_seconds),
            'questions_answers': questions_answers
        })
    
    overall_score = calculate_overall_score({'rounds': rounds_data})
    
    return {
        'session_id': session_id,
        'candidate_name': resume.candidate_name if resume else None,
        'candidate_email': resume.candidate_email if resume else None,
        'resume_content': resume.content if resume else 'N/A',
        'resume_filename': resume.filename if resume else 'N/A',
        'rounds': rounds_data,
        'total_score': overall_score,
        'total_time_formatted': format_time_display(session.total_time_seconds),
        'total_time_seconds': session.total_time_seconds,
        'created_at': session.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        'completed_at': session.completed_at.strftime('%Y-%m-%d %H:%M:%S') if session.completed_at else 'N/A'
    }

async def generate_avatar_report_data(session_id: str) -> dict:
    """Compile all avatar interview data for report generation"""
    # Get avatar session
    session = await AvatarInterviewSession.get(session_id)
    if not session:
        raise ValueError("Avatar Session not found")
    
    # Get resume
    resume = None
    if session.resume_id:
        resume = await Resume.get(session.resume_id)
    
    # Get all responses for this session
    responses = await AvatarResponse.find(AvatarResponse.session_id == session_id).to_list()
    
    # Group responses by round_type
    rounds_data_map = {}
    
    for resp in responses:
        # Get question details
        question = await AvatarQuestion.get(resp.question_id)
        if not question:
            continue
            
        round_type = question.round_type.capitalize()
        if round_type not in rounds_data_map:
            rounds_data_map[round_type] = {
                'round_type': round_type,
                'status': 'completed',
                'questions_answers': [],
                'total_time_seconds': 0
            }
        
        rounds_data_map[round_type]['questions_answers'].append({
            'question': question.question_text,
            'answer': resp.answer_text,
            'evaluation': resp.evaluation,
            'score': resp.score,
            'time_taken': format_time_display(resp.time_taken_seconds),
            'is_followup': question.is_followup
        })
        rounds_data_map[round_type]['total_time_seconds'] += resp.time_taken_seconds
    
    # Convert map to list and format times
    rounds_data = []
    for r_type, r_data in rounds_data_map.items():
        r_data['total_time'] = format_time_display(r_data['total_time_seconds'])
        rounds_data.append(r_data)
    
    # Calculate overall score (average over questions answered)
    overall_score = 0.0
    if session.questions_answered > 0:
        overall_score = session.total_score / session.questions_answered
    
    return {
        'session_id': session_id,
        'candidate_name': resume.candidate_name if resume else None,
        'candidate_email': resume.candidate_email if resume else None,
        'resume_content': resume.content if resume else 'N/A',
        'resume_filename': resume.filename if resume else 'N/A',
        'rounds': rounds_data,
        'total_score': overall_score,
        'total_time_formatted': format_time_display(session.total_time_seconds),
        'total_time_seconds': session.total_time_seconds,
        'created_at': session.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        'completed_at': session.completed_at.strftime('%Y-%m-%d %H:%M:%S') if session.completed_at else 'N/A',
        'is_avatar': True
    }

async def generate_pdf_report(session_id: str) -> bytes:
    """Generate comprehensive PDF report using Krutrim AI for content generation"""
    
    # Compile session data
    session_data = await generate_final_report_data(session_id)
    
    # Generate AI-powered report content
    ai_report_content = await generate_report_content_with_krutrim(session_data)
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1a237e'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#283593'),
        spaceAfter=12,
        spaceBefore=12
    )
    normal_style = styles['Normal']
    
    # Build PDF content
    story = []
    
    # Title
    story.append(Paragraph("AI Interview Performance Report", title_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Candidate Info (if available)
    if session_data.get('candidate_name') or session_data.get('candidate_email'):
        candidate_info = []
        if session_data.get('candidate_name'):
            candidate_info.append(['Candidate:', session_data['candidate_name']])
        if session_data.get('candidate_email'):
            candidate_info.append(['Email:', session_data['candidate_email']])
        
        if candidate_info:
            candidate_table = Table(candidate_info, colWidths=[1.5*inch, 4.5*inch])
            candidate_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e3f2fd')),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 11),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey)
            ]))
            story.append(candidate_table)
            story.append(Spacer(1, 0.2*inch))
    
    # Session Info Table
    session_info = [
        ['Session ID:', str(session_data['session_id'])],
        ['Resume:', session_data['resume_filename']],
        ['Interview Date:', session_data['created_at']],
        ['Total Duration:', session_data['total_time_formatted']],
        ['Overall Score:', f"{session_data['total_score']:.1f}/10"]
    ]
    
    info_table = Table(session_info, colWidths=[2*inch, 4*inch])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e8eaf6')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey)
    ]))
    
    story.append(info_table)
    story.append(Spacer(1, 0.3*inch))
    
    # AI-Generated Report Content
    story.append(Paragraph("Performance Analysis", heading_style))
    
    # Parse and add AI report content
    for line in ai_report_content.split('\n'):
        line = line.strip()
        if line:
            if line.startswith('# '):
                story.append(Paragraph(line[2:], heading_style))
            elif line.startswith('## '):
                story.append(Paragraph(line[3:], styles['Heading3']))
            elif line.startswith('- ') or line.startswith('* '):
                story.append(Paragraph(f"• {line[2:]}", normal_style))
            else:
                story.append(Paragraph(line, normal_style))
            story.append(Spacer(1, 0.1*inch))
    
    story.append(PageBreak())
    
    # Detailed Round-by-Round Analysis
    story.append(Paragraph("Detailed Question-Answer Analysis", heading_style))
    story.append(Spacer(1, 0.2*inch))
    
    for round_data in session_data['rounds']:
        # Round header
        story.append(Paragraph(f"{round_data['round_type']} Round", styles['Heading3']))
        story.append(Paragraph(f"Time: {round_data['total_time']}", normal_style))
        story.append(Spacer(1, 0.1*inch))
        
        # Questions and answers
        for i, qa in enumerate(round_data['questions_answers'], 1):
            story.append(Paragraph(f"<b>Q{i}:</b> {qa['question']}", normal_style))
            story.append(Spacer(1, 0.05*inch))
            story.append(Paragraph(f"<b>Answer:</b> {qa['answer']}", normal_style))
            story.append(Spacer(1, 0.05*inch))
            story.append(Paragraph(f"<b>Evaluation:</b> {qa['evaluation']}", normal_style))
            story.append(Paragraph(f"<b>Score:</b> {qa['score']}/10 | <b>Time:</b> {qa['time_taken']}", normal_style))
            story.append(Spacer(1, 0.15*inch))
        
        story.append(Spacer(1, 0.2*inch))
    
    # Footer
    story.append(Spacer(1, 0.3*inch))
    footer_text = f"Report generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Powered by Krutrim AI"
    story.append(Paragraph(footer_text, ParagraphStyle('Footer', parent=normal_style, fontSize=8, textColor=colors.grey, alignment=TA_CENTER)))
    
    # Build PDF
    doc.build(story)
    
    # Get PDF bytes
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes

async def generate_avatar_pdf_report(session_id: str) -> bytes:
    """Generate comprehensive PDF report for Avatar Interview"""
    
    # Compile session data
    session_data = await generate_avatar_report_data(session_id)
    
    # Generate AI-powered report content
    ai_report_content = await generate_report_content_with_krutrim(session_data)
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1a237e'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#283593'),
        spaceAfter=12,
        spaceBefore=12
    )
    normal_style = styles['Normal']
    
    # Build PDF content
    story = []
    
    # Title
    story.append(Paragraph("AI Avatar Interview Performance Report", title_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Candidate Info
    if session_data.get('candidate_name') or session_data.get('candidate_email'):
        candidate_info = []
        if session_data.get('candidate_name'):
            candidate_info.append(['Candidate:', session_data['candidate_name']])
        if session_data.get('candidate_email'):
            candidate_info.append(['Email:', session_data['candidate_email']])
        
        candidate_table = Table(candidate_info, colWidths=[1.5*inch, 4.5*inch])
        candidate_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e3f2fd')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey)
        ]))
        story.append(candidate_table)
        story.append(Spacer(1, 0.2*inch))
    
    # Session Info Table
    session_info = [
        ['Session ID:', str(session_data['session_id'])],
        ['Resume:', session_data['resume_filename']],
        ['Interview Type:', 'AI Avatar Interaction'],
        ['Interview Date:', session_data['created_at']],
        ['Total Duration:', session_data['total_time_formatted']],
        ['Overall Score:', f"{session_data['total_score']:.1f}/10"]
    ]
    
    info_table = Table(session_info, colWidths=[2*inch, 4*inch])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e8eaf6')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey)
    ]))
    
    story.append(info_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Performance Analysis
    story.append(Paragraph("Performance Analysis", heading_style))
    for line in ai_report_content.split('\n'):
        line = line.strip()
        if line:
            if line.startswith('# '):
                story.append(Paragraph(line[2:], heading_style))
            elif line.startswith('## '):
                story.append(Paragraph(line[3:], styles['Heading3']))
            elif line.startswith('- ') or line.startswith('* '):
                story.append(Paragraph(f"• {line[2:]}", normal_style))
            else:
                story.append(Paragraph(line, normal_style))
            story.append(Spacer(1, 0.1*inch))
    
    story.append(PageBreak())
    
    # Detailed Analysis
    story.append(Paragraph("Conversation & Question Breakdown", heading_style))
    story.append(Spacer(1, 0.2*inch))
    
    for round_data in session_data['rounds']:
        story.append(Paragraph(f"{round_data['round_type']} Round", styles['Heading3']))
        story.append(Spacer(1, 0.1*inch))
        
        for i, qa in enumerate(round_data['questions_answers'], 1):
            q_label = f"Q{i}"
            if qa.get('is_followup'):
                q_label += " (Follow-up)"
            
            story.append(Paragraph(f"<b>{q_label}:</b> {qa['question']}", normal_style))
            story.append(Spacer(1, 0.05*inch))
            story.append(Paragraph(f"<b>Response:</b> {qa['answer']}", normal_style))
            story.append(Spacer(1, 0.05*inch))
            story.append(Paragraph(f"<b>Feedback:</b> {qa['evaluation']}", normal_style))
            story.append(Paragraph(f"<b>Score:</b> {qa['score']}/10 | <b>Time:</b> {qa['time_taken']}", normal_style))
            story.append(Spacer(1, 0.15*inch))
        
        story.append(Spacer(1, 0.2*inch))
    
    # Footer
    story.append(Spacer(1, 0.3*inch))
    footer_text = f"Report generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | CareerPath AI Avatar Interview"
    story.append(Paragraph(footer_text, ParagraphStyle('Footer', parent=normal_style, fontSize=8, textColor=colors.grey, alignment=TA_CENTER)))
    
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

from reportlab.platypus import Flowable
class Separator(Flowable):
    def __init__(self, width):
        Flowable.__init__(self)
        self.width = width
    def draw(self):
        self.canv.setStrokeColor(colors.lightgrey)
        self.canv.line(0, 0, self.width, 0)
